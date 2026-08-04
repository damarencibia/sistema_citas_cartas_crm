// Prueba integral del flujo Web Push usado en la Edge Function send-push:
//  1. Cifra un payload (RFC 8291) y lo descifra de nuevo simulando el navegador.
//  2. Firma un token VAPID (ES256) y verifica la firma.
// Uso: node scripts/test-webpush-full.mjs
import { subtle } from 'node:crypto';

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  return new Uint8Array(Buffer.from(b64 + pad, 'base64'));
};
const bytesToBase64Url = (b) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const strToBytes = (s) => new TextEncoder().encode(s);
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((acc, a) => acc + a.length, 0));
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
};

async function hkdfExtract(salt, ikm) {
  const key = await subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', key, ikm));
}
async function hkdfExpand(prk, info, length) {
  const key = await subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = new Uint8Array(length);
  let t = new Uint8Array(0);
  let done = 0;
  for (let i = 1; done < length; i++) {
    t = new Uint8Array(await subtle.sign('HMAC', key, concat(t, info, new Uint8Array([i]))));
    const take = Math.min(t.length, length - done);
    out.set(t.subarray(0, take), done);
    done += take;
  }
  return out;
}

// --- idéntico a la Edge Function ---
async function encryptPayload(p256dh, authSecret, plaintext) {
  const uaPublic = b64urlToBytes(p256dh);
  const authSecretBytes = b64urlToBytes(authSecret);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const uaKey = await subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: uaKey }, kp.privateKey, 256));
  const keyInfo = concat(strToBytes('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const prkKey = await hkdfExtract(authSecretBytes, ecdhSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: nonce'), new Uint8Array([0])), 12);
  const aesKey = await subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const body = concat(strToBytes(plaintext), new Uint8Array([0x02]));
  const encrypted = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, body));
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = 65;
  header.set(asPublic, 21);
  return concat(header, encrypted);
}

async function decryptPayload(cipher, uaPrivateJwk, authSecret) {
  const salt = cipher.subarray(0, 16);
  const idlen = cipher[20];
  const id = cipher.subarray(21, 21 + idlen);
  const encrypted = cipher.subarray(21 + idlen);
  const asPubKey = await subtle.importKey('raw', id, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const uaPrivKey = await subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: uaPrivateJwk.x, y: uaPrivateJwk.y, d: uaPrivateJwk.d },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asPubKey }, uaPrivKey, 256));
  const keyInfo = concat(strToBytes('WebPush: info'), new Uint8Array([0]), b64urlToBytes(p256dh), id);
  const prkKey = await hkdfExtract(b64urlToBytes(authSecret), ecdhSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk, concat(strToBytes('Content-Encoding: nonce'), new Uint8Array([0])), 12);
  const aesKey = await subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, encrypted));
  return new TextDecoder().decode(plain.subarray(0, plain.length - 1));
}

// --- VAPID: firma y verificación ---
async function importVapidSignKey(privateKeyB64url, publicKeyB64url) {
  const pub = b64urlToBytes(publicKeyB64url);
  const priv = b64urlToBytes(privateKeyB64url);
  return subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      x: bytesToBase64Url(pub.subarray(1, 33)),
      y: bytesToBase64Url(pub.subarray(33, 65)),
      d: bytesToBase64Url(priv),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function createVapidToken(aud, subject, privateKeyB64url, publicKeyB64url) {
  const key = await importVapidSignKey(privateKeyB64url, publicKeyB64url);
  const encode = (obj) => bytesToBase64Url(strToBytes(JSON.stringify(obj)));
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud, exp: now + 12 * 3600, sub: subject };
  const signingInput = `${encode(header)}.${encode(claims)}`;
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, strToBytes(signingInput)));
  return `${signingInput}.${bytesToBase64Url(sig)}`;
}

// --- Generar "suscripción del navegador" ---
const uaKp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPubRaw = new Uint8Array(await subtle.exportKey('raw', uaKp.publicKey));
const uaPrivJwk = await subtle.exportKey('jwk', uaKp.privateKey);
const p256dh = bytesToBase64Url(uaPubRaw);
const auth = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));

const message = JSON.stringify({ title: 'Nueva reserva', body: 'Corte · 05/08 a las 10:00', url: 'https://nexoplatform.app/appointments/bookings' });
const cipher = await encryptPayload(p256dh, auth, message);
const decrypted = await decryptPayload(cipher, uaPrivJwk, auth);
console.log(decrypted === message ? '✓ round-trip cifrado/descifrado OK' : `✗ MISMATCH: ${decrypted}`);

// VAPID
const VAPID_PUBLIC = 'BFiFQS_39s6Todi0HcECGSLUwRAUV9_YQAMu4pt83rHse5cVN0vJpsjogtXKcswOARyEGdHQ2N5q2X96W7_jo-M';
const VAPID_PRIVATE = 'hL0Sth3wnxVEDDMQ15DjFNDGJWMvrHU4JkKakeDp3H8';
const token = await createVapidToken('https://fcm.googleapis.com', 'mailto:test@nexo.app', VAPID_PRIVATE, VAPID_PUBLIC);
const [h, c, s] = token.split('.');
const verifyKey = await subtle.importKey(
  'raw',
  b64urlToBytes(VAPID_PUBLIC),
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['verify'],
);
const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, b64urlToBytes(s), strToBytes(`${h}.${c}`));
console.log(ok ? '✓ token VAPID firmado y verificado OK' : '✗ VAPID signature FAILED');
