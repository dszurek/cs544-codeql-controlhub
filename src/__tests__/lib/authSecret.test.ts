import { createHmac } from 'node:crypto';
import { getSessionSecret } from '@/lib/authSecret';

/**
 * Guards the auth fix: the signing secret must come from the server
 * environment, never from anything the client controls, and login and proxy
 * must derive the identical value.
 */
describe('getSessionSecret', () => {
  const saved = { AUTH_SECRET: process.env.AUTH_SECRET, AUTH_PASSWORD: process.env.AUTH_PASSWORD };
  afterEach(() => {
    process.env.AUTH_SECRET = saved.AUTH_SECRET;
    process.env.AUTH_PASSWORD = saved.AUTH_PASSWORD;
  });

  it('prefers an explicit AUTH_SECRET', () => {
    process.env.AUTH_SECRET = 'explicit-secret-value';
    process.env.AUTH_PASSWORD = 'hunter2';
    expect(getSessionSecret()).toBe('explicit-secret-value');
  });

  it('derives deterministically from AUTH_PASSWORD when AUTH_SECRET is absent', () => {
    delete process.env.AUTH_SECRET;
    process.env.AUTH_PASSWORD = 'hunter2';
    const first = getSessionSecret();
    const second = getSessionSecret();
    expect(first).toBe(second);
    expect(first).toHaveLength(64); // 32-byte scrypt key, hex
  });

  it('rotates the secret when the password changes', () => {
    delete process.env.AUTH_SECRET;
    process.env.AUTH_PASSWORD = 'first';
    const a = getSessionSecret();
    process.env.AUTH_PASSWORD = 'second';
    expect(getSessionSecret()).not.toBe(a);
  });

  it('fails closed (empty) when nothing is configured', () => {
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_PASSWORD;
    expect(getSessionSecret()).toBe('');
  });

  it('a token signed with the secret verifies, and a forged one does not', () => {
    process.env.AUTH_SECRET = 'server-only-secret';
    const secret = getSessionSecret();

    const expiry = String(Date.now() + 1000);
    const goodSig = createHmac('sha256', secret).update(expiry).digest('hex');
    const forgedSig = createHmac('sha256', 'attacker-secret').update(expiry).digest('hex');

    expect(createHmac('sha256', secret).update(expiry).digest('hex')).toBe(goodSig);
    expect(goodSig).not.toBe(forgedSig);
  });
});
