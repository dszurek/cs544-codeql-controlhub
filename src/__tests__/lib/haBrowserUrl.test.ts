import {
  resolveHaBrowserUrl,
  isMixedContentBlocked,
  isLoopbackHost,
} from '@/lib/haBrowserUrl';

const pi = { hostname: '100.84.12.3', protocol: 'http:' };       // Tailscale
const kiosk = { hostname: 'localhost', protocol: 'http:' };      // on the Pi
const tunnel = { hostname: 'hub.example.com', protocol: 'https:' };

describe('isLoopbackHost', () => {
  it('recognizes the loopback spellings', () => {
    for (const h of ['localhost', 'LOCALHOST', '127.0.0.1', '0.0.0.0', '::1']) {
      expect(isLoopbackHost(h)).toBe(true);
    }
    expect(isLoopbackHost('homeassistant.local')).toBe(false);
    expect(isLoopbackHost('100.84.12.3')).toBe(false);
  });
});

describe('resolveHaBrowserUrl', () => {
  it('rewrites a loopback HA url to the page host when browsing remotely', () => {
    expect(resolveHaBrowserUrl('http://localhost:8123', pi)).toBe('http://100.84.12.3:8123');
  });

  it('leaves loopback alone when the page is itself loopback (Pi kiosk)', () => {
    expect(resolveHaBrowserUrl('http://localhost:8123', kiosk)).toBe('http://localhost:8123');
  });

  it('leaves a real hostname untouched', () => {
    expect(resolveHaBrowserUrl('http://homeassistant.local:8123', pi)).toBe(
      'http://homeassistant.local:8123',
    );
  });

  it('preserves the port and scheme when rewriting', () => {
    expect(resolveHaBrowserUrl('https://127.0.0.1:9000', pi)).toBe('https://100.84.12.3:9000');
  });

  it('defaults the port when the url omits it', () => {
    expect(resolveHaBrowserUrl('http://localhost', pi)).toBe('http://100.84.12.3:80');
  });

  it('strips paths and trailing slashes down to an origin', () => {
    expect(resolveHaBrowserUrl('http://homeassistant.local:8123/lovelace/0', pi)).toBe(
      'http://homeassistant.local:8123',
    );
  });

  it('returns null for empty or unusable input', () => {
    expect(resolveHaBrowserUrl(null, pi)).toBeNull();
    expect(resolveHaBrowserUrl('', pi)).toBeNull();
    expect(resolveHaBrowserUrl('not a url', pi)).toBeNull();
    expect(resolveHaBrowserUrl('ftp://localhost:8123', pi)).toBeNull();
  });
});

describe('isMixedContentBlocked', () => {
  it('flags http HA behind an https page', () => {
    expect(isMixedContentBlocked('http://100.84.12.3:8123', tunnel)).toBe(true);
  });

  it('allows matching schemes', () => {
    expect(isMixedContentBlocked('http://100.84.12.3:8123', pi)).toBe(false);
    expect(isMixedContentBlocked('https://ha.example.com', tunnel)).toBe(false);
  });

  it('is false when there is no url', () => {
    expect(isMixedContentBlocked(null, tunnel)).toBe(false);
  });
});
