/**
 * Genera una contraseña aleatoria legible para compartir:
 * sin caracteres ambiguos (0/O, 1/l/I) y siempre >= 8 caracteres.
 * Espejo del generador del Edge Function reset-team-member-password.
 */
const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePassword(length = 10): string {
  const random = new Uint8Array(length);
  crypto.getRandomValues(random);
  return Array.from(random, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}
