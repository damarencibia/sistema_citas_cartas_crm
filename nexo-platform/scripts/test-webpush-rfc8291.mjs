// Verificación de la implementación de cifrado Web Push (RFC 8291)
// contra el vector de prueba oficial del Apéndice A (incluye valores intermedios).
// Uso: node scripts/test-webpush-rfc8291.mjs
import { subtle } from 'node:crypto';

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  return new Uint8Array(Buffer.from(b64 + pad, 'base64'));
};

const bytesToB64url = (b) =>
  Buffer.from(b)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

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

async function hkdf(ikm, salt, info, length) {
  const prk = await hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

let failures = 0;
function check(label, got, expected) {
  const ok = bytesToB64url(got) === bytesToB64url(expected);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n  got     ${bytesToB64url(got)}\n  expected ${bytesToB64url(expected)}`}`);
}

// --- Vector de prueba RFC 8291 Apéndice A ---
const as_public = b64urlToBytes(
  'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
);
const as_private = b64urlToBytes('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw');
const ua_public = b64urlToBytes(
  'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
);
const auth_secret = b64urlToBytes('BTBZMqHH6r4Tts7J_aSIgg');
const salt = b64urlToBytes('DGv6ra1nlYgDCS1FRnbzlw');
const plaintext = concat(
  strToBytes('When I grow up, I want to be a watermelon'),
  new Uint8Array([0x02]),
);
const expected = b64urlToBytes(
  'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
);

// Intermedios esperados según Apéndice A
const expected_ecdh = b64urlToBytes('kyrL1jIIOHEzg3sM2ZWRHDRB62YACZhhSlknJ672kSs');
const expected_prk_key = b64urlToBytes('Snr3JMxaHVDXHWJn5wdC52WjpCtd2EIEGBykDcZW32k');
const expected_ikm = b64urlToBytes('S4lYMb_L0FxCeq0WhDx813KgSYqU26kOyzWUdsXYyrg');
const expected_prk = b64urlToBytes('09_eUZGrsvxChDCGRCdkLiDXrReGOEVeSCdCcPBSJSc');
const expected_cek = b64urlToBytes('oIhVW04MRdy2XN9CiKLxTg');
const expected_nonce = b64urlToBytes('4h_95klXJ5E_qnoN');

// Importar claves
const x = bytesToB64url(as_public.subarray(1, 33));
const y = bytesToB64url(as_public.subarray(33, 65));
const d = bytesToB64url(as_private);
const asPrivKey = await subtle.importKey(
  'jwk',
  { kty: 'EC', crv: 'P-256', x, y, d, ext: true },
  { name: 'ECDH', namedCurve: 'P-256' },
  false,
  ['deriveBits'],
);
const uaPubKey = await subtle.importKey('raw', ua_public, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

// 1. ECDH
const ecdhSecret = new Uint8Array(
  await subtle.deriveBits({ name: 'ECDH', public: uaPubKey }, asPrivKey, 256),
);
check('ecdh_secret', ecdhSecret, expected_ecdh);

// 2. Derivación (RFC 8291 §3.4)
const keyInfo = concat(strToBytes('WebPush: info'), new Uint8Array([0]), ua_public, as_public);
const prkKey = await hkdfExtract(auth_secret, ecdhSecret);
check('PRK_key = Extract(auth_secret, ecdh_secret)', prkKey, expected_prk_key);

const ikm = await hkdfExpand(prkKey, keyInfo, 32);
check('IKM = Expand(PRK_key, key_info, 32)', ikm, expected_ikm);

const prk = await hkdfExtract(salt, ikm);
check('PRK = Extract(salt, IKM)', prk, expected_prk);

const cekInfo = concat(strToBytes('Content-Encoding: aes128gcm'), new Uint8Array([0]));
const nonceInfo = concat(strToBytes('Content-Encoding: nonce'), new Uint8Array([0]));
const cek = await hkdfExpand(prk, cekInfo, 16);
check('CEK = Expand(PRK, cek_info, 16)', cek, expected_cek);

const nonce = await hkdfExpand(prk, nonceInfo, 12);
check('NONCE = Expand(PRK, nonce_info, 12)', nonce, expected_nonce);

// 3. AES-128-GCM
const aesKey = await subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
const encrypted = new Uint8Array(
  await subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext),
);

// 4. Ensamblar mensaje: salt(16) || rs(4 BE) || idlen(1) || id(65) || ciphertext
const header = new Uint8Array(86);
header.set(salt, 0);
new DataView(header.buffer).setUint32(16, 4096, false);
header[20] = 65;
header.set(as_public, 21);

const message = concat(header, encrypted);
check('mensaje completo (header + ciphertext)', message, expected);

if (failures > 0) {
  console.log(`\n✗ ${failures} comprobación(es) fallaron`);
  process.exit(1);
}
console.log('\n✓ Todas las comprobaciones del RFC 8291 pasaron');
process.exit(0);
