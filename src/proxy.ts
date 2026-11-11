import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSessionSecret } from '@/lib/authSecret';

const COOKIE_NAME = 'controlhub_session';

// Paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/calendar/feed/', // token-protected ICS feed
  '/api/health/ingest',  // bearer-token protected (Health Auto Export pushes)
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

/**
 * Next.js 16 "proxy" replaces "middleware" and ALWAYS runs on the Node.js
 * runtime, so it reads the signing secret straight from the server environment
 * (see authSecret.ts). The secret never touches the client — the session cookie
 * is just an HMAC of its own expiry, verified here with the same server-side
 * secret that lib/auth.ts used to sign it.
 */
function verifyToken(token: string): boolean {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const secret = getSessionSecret();
  if (!secret) return false; // no auth configured — fail closed

  const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');

  // Constant-time compare; timingSafeEqual throws on length mismatch.
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiry = parseInt(payload, 10);
  return Number.isFinite(expiry) && Date.now() <= expiry;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // OAuth callbacks must pass through
  if (pathname.startsWith('/api/auth/outlook') || pathname.startsWith('/api/auth/gmail')) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;

  // No session — redirect or 401
  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Verify the session token
  if (!verifyToken(sessionToken)) {
    // Clear invalid cookies
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    response.cookies.delete('controlhub_secret');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
