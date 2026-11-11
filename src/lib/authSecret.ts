import { scryptSync } from 'node:crypto';

/**
 * The HMAC secret used to sign session tokens.
 *
 * This MUST stay server-side. The previous design shipped the secret to the
 * browser in a `controlhub_secret` cookie and let the proxy verify tokens
 * against that client-supplied value — which meant an attacker could pick their
 * own secret, sign their own token with it, and be trusted. (Next.js 16 proxy
 * always runs on the Node.js runtime, so the "Edge can't read process.env"
 * reasoning behind that hack never applied here.)
 *
 * Derivation, in order of preference:
 *   1. AUTH_SECRET, if set — a stable, explicit secret. Recommended.
 *   2. Otherwise derived from AUTH_PASSWORD, so a single-secret .env still
 *      works out of the box. Changing the password rotates the secret and
 *      invalidates existing sessions, which is the safe default.
 *
 * The password is stretched with scrypt (a memory-hard KDF) rather than a
 * single SHA-256 pass, so a leaked token/secret cannot be brute-forced back to
 * the password cheaply. The result is cached per password because the proxy
 * calls this on every request.
 *
 * Both the login route (node) and the proxy (node) import this and get the
 * same value, so no secret ever crosses the network.
 */
const SCRYPT_SALT = 'controlhub:session:v1';
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
let cached: { password: string; secret: string } | null = null;

export function getSessionSecret(): string {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length > 0) return explicit;

  const password = process.env.AUTH_PASSWORD;
  if (!password) return ''; // no auth configured — token verification will fail closed

  if (cached && cached.password === password) return cached.secret;
  const secret = scryptSync(password, SCRYPT_SALT, 32, SCRYPT_PARAMS).toString('hex');
  cached = { password, secret };
  return secret;
}
