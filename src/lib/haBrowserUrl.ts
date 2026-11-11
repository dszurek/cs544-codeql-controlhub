/**
 * Resolving a Home Assistant URL that works from *this browser*.
 *
 * The `ha_url` setting is stored for the server's benefit. On the Pi it is
 * normally `http://localhost:8123`, which is right for ControlHub's own
 * server-side REST calls — but a browser is a different machine. Open the hub
 * on your phone over Tailscale and `localhost:8123` points at the *phone*, so
 * the live WebSocket connection and the embedded HA panel both fail.
 *
 * When the stored host is loopback and the page itself is not, the page's own
 * hostname is the one address we know reached the Pi, so borrow it and keep
 * HA's port.
 */

const LOOPBACK = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK.has(hostname.toLowerCase());
}

export interface PageLocation {
  hostname: string;
  protocol: string; // 'http:' | 'https:'
}

/**
 * @param haUrl  the configured `ha_url` setting, e.g. 'http://localhost:8123'
 * @param page   where the current page was served from
 * @returns an origin with no trailing slash, or null if `haUrl` is unusable
 */
export function resolveHaBrowserUrl(
  haUrl: string | null | undefined,
  page: PageLocation,
): string | null {
  if (!haUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(haUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // Already reachable as-is: either it names a real host, or we genuinely are
  // on the Pi (kiosk mode), where loopback is correct.
  if (!isLoopbackHost(parsed.hostname) || isLoopbackHost(page.hostname)) {
    return parsed.origin;
  }

  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  return `${parsed.protocol}//${page.hostname}:${port}`;
}

/**
 * True when the page is HTTPS but HA is plain HTTP. The browser will block the
 * connection as mixed content and there is nothing the app can do about it, so
 * the UI says so rather than showing an empty frame.
 */
export function isMixedContentBlocked(
  resolvedHaUrl: string | null,
  page: PageLocation,
): boolean {
  if (!resolvedHaUrl) return false;
  return page.protocol === 'https:' && resolvedHaUrl.startsWith('http://');
}
