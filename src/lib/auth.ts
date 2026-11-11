import { cookies } from 'next/headers';
import { createHmac } from 'node:crypto';
import { getSessionSecret } from './authSecret';

const COOKIE_NAME = 'controlhub_session';
const LEGACY_SECRET_COOKIE = 'controlhub_secret'; // deleted on logout for cleanup
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---- Session token management ----
// The signing secret lives server-side (see authSecret.ts) and never leaves
// the process, so the token is a plain HMAC of its own expiry.

function createSessionToken(): string {
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = String(expiry);
  const sig = createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// ---- Password verification ----

/**
 * The password is set in .env.local as AUTH_PASSWORD.
 * This file is gitignored, so it never gets pushed to GitHub.
 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    // No password configured — block all access
    console.error('AUTH_PASSWORD is not set in .env.local');
    return false;
  }
  return password === expected;
}


// ---- Session cookie management ----

export async function createSession(): Promise<void> {
  const token = createSessionToken();
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(LEGACY_SECRET_COOKIE);
}

// ---- Sensitive key detection (for settings API redaction) ----

const SENSITIVE_PATTERNS = [
  '_token',
  '_secret',
  '_password',
  '_access_token',
  '_refresh_token',
  'auth_password_hash',
  'auth_secret',
];

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((p) => lower.includes(p));
}
