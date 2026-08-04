// Genera un par de claves VAPID en el formato usado por web-push:
//   publicKey  = base64url del punto público sin comprimir (0x04 || x || y), 65 bytes
//   privateKey = base64url del escalar privado, 32 bytes
// Uso: node scripts/generate-vapid-keys.mjs
import { subtle } from 'node:crypto';

const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pubJwk = await subtle.exportKey('jwk', kp.publicKey);
const privJwk = await subtle.exportKey('jwk', kp.privateKey);

const x = Buffer.from(pubJwk.x, 'base64url');
const y = Buffer.from(pubJwk.y, 'base64url');
const publicKey = Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url');
const privateKey = privJwk.d;

console.log('VAPID_PUBLIC_KEY=' + publicKey);
console.log('VAPID_PRIVATE_KEY=' + privateKey);
console.log('\n(Si vas a usar la app localmente, añade a .env:)');
console.log('VITE_VAPID_PUBLIC_KEY=' + publicKey);
