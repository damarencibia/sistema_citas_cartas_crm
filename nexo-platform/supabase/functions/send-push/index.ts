// Edge Function: send-push
// Envía notificaciones push (Web Push) a las suscripciones de un usuario.
// Se invoca vía pg_net desde el trigger SQL (create_notification) con el
// header x-push-secret. Usa Web Crypto nativo (sin dependencias npm).
//
// Secrets requeridos:
//   PUSH_SECRET          — secreto compartido (debe coincidir con la BD)
//   VAPID_PUBLIC_KEY     — clave pública VAPID (base64url, punto 65 bytes)
//   VAPID_PRIVATE_KEY    — clave privada VAPID (base64url, escalar 32 bytes)
//   VAPID_SUBJECT        — mailto: de contacto
//   APP_URL              — URL base de la app (para el click de la notificación)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son inyectados automáticamente.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/responses.ts';

// --- utilidades base64url / bytes ---
function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(base64 + padding);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const strToBytes = (s: string): Uint8Array => new TextEncoder().encode(s);

function concat(...arrs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrs.reduce((acc, a) => acc + a.length, 0));
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// --- HKDF (RFC 5869) con Web Crypto ---
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = new Uint8Array(length);
  let t = new Uint8Array(0);
  let done = 0;
  for (let i = 1; done < length; i++) {
    t = new Uint8Array(await crypto.subtle.sign('HMAC', key, concat(t, info, new Uint8Array([i]))));
    const take = Math.min(t.length, length - done);
    out.set(t.subarray(0, take), done);
    done += take;
  }
  return out;
}

// --- Cifrado del payload (RFC 8291, verificado contra el Apéndice A) ---
async function encryptPayload(p256dh: string, authSecret: string, plaintext: string): Promise<Uint8Array> {
  const uaPublic = base64UrlToBytes(p256dh);
  const authSecretBytes = base64UrlToBytes(authSecret);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, kp.privateKey, 256),
  );

  const keyInfo = concat(strToBytes('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const prkKey = await hkdfExtract(authSecretBytes, ecdhSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const body = concat(strToBytes(plaintext), new Uint8Array([0x02]));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, body),
  );

  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(asPublic, 21);

  return concat(header, encrypted);
}

// --- VAPID (RFC 8292): firma JWT ES256 ---
async function importVapidKey(privateKeyB64url: string, publicKeyB64url: string): Promise<CryptoKey> {
  const pub = base64UrlToBytes(publicKeyB64url);
  const priv = base64UrlToBytes(privateKeyB64url);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(pub.subarray(1, 33)),
    y: bytesToBase64Url(pub.subarray(33, 65)),
    d: bytesToBase64Url(priv),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function createVapidToken(
  aud: string,
  subject: string,
  privateKeyB64url: string,
  publicKeyB64url: string,
): Promise<string> {
  const key = await importVapidKey(privateKeyB64url, publicKeyB64url);
  const encode = (obj: unknown) => bytesToBase64Url(strToBytes(JSON.stringify(obj)));
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud, exp: now + 12 * 3600, sub: subject };
  const signingInput = `${encode(header)}.${encode(claims)}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, strToBytes(signingInput)),
  );
  return `${signingInput}.${bytesToBase64Url(sig)}`;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  tenant_id: string | null;
}

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:notificaciones@nexoplatform.app';
const PUSH_SECRET = Deno.env.get('PUSH_SECRET');
const APP_URL = Deno.env.get('APP_URL') || 'https://nexoplatform.app';

function buildNotificationUrl(data: Record<string, unknown>): string {
  const type = typeof data?.notification_type === 'string' ? data.notification_type : '';
  if (type === 'booking_created' || type === 'booking_pending_approval' || type === 'waitlist_offer') {
    return `${APP_URL}/appointments/bookings`;
  }
  return `${APP_URL}/`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!PUSH_SECRET || req.headers.get('x-push-secret') !== PUSH_SECRET) {
    return errorResponse('Unauthorized', 401);
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return errorResponse('VAPID keys not configured', 500);
  }

  try {
    const payload = await req.json();
    const recipientUserId: string | undefined = payload?.recipient_user_id;
    const tenantId: string | null | undefined = payload?.tenant_id;
    const title: string = payload?.title || 'Nexo Platform';
    const body: string = payload?.body || '';
    const data: Record<string, unknown> = payload?.data || {};

    if (!recipientUserId) {
      return errorResponse('recipient_user_id is required', 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, tenant_id')
      .eq('user_id', recipientUserId);

    if (error) {
      throw new Error(`Error consultando suscripciones: ${error.message}`);
    }

    const rows = (subscriptions as PushSubscriptionRow[] | null) ?? [];
    if (rows.length === 0) {
      return successResponse({ sent: 0, deleted: 0, skipped: 0 });
    }

    const plaintext = JSON.stringify({ title, body, url: buildNotificationUrl(data) });

    let sent = 0;
    let deleted = 0;
    let skipped = 0;

    for (const sub of rows) {
      if (tenantId && sub.tenant_id && sub.tenant_id !== tenantId) {
        skipped++;
        continue;
      }

      try {
        const encryptedPayload = await encryptPayload(sub.p256dh, sub.auth, plaintext);
        const origin = new URL(sub.endpoint).origin;
        const token = await createVapidToken(origin, VAPID_SUBJECT, VAPID_PRIVATE, VAPID_PUBLIC);
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '86400',
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            'Authorization': `vapid t=${token}, k=${VAPID_PUBLIC}`,
          },
          body: encryptedPayload,
        });

        if (response.status === 404 || response.status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          deleted++;
        } else if (response.ok) {
          sent++;
        } else {
          skipped++;
          console.warn(`send-push: endpoint ${sub.endpoint} respondió ${response.status}`);
        }
      } catch (err) {
        skipped++;
        console.error(`send-push: error enviando a ${sub.endpoint}:`, err);
      }
    }

    return successResponse({ sent, deleted, skipped });
  } catch (err) {
    console.error('send-push error:', err);
    return errorResponse((err as Error).message, 500);
  }
});
