import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSetting } from '@/lib/settings';
import { ingestHaePayload } from '@/lib/health/ingest';

/**
 * Ingestion endpoint for Health Auto Export (iOS). Exempt from the
 * session proxy; authenticated by a dedicated bearer token instead so
 * the Shortcuts automation can push without a cookie login.
 *
 * HAE setup: REST API export → URL https://<pi-over-tailscale>/api/health/ingest
 * with header  Authorization: Bearer <token from /api/health/setup>.
 */
export async function POST(request: NextRequest) {
  const token = await getSetting('health_ingest_token');
  if (!token) {
    return NextResponse.json(
      { error: 'Ingestion token not configured. Open the Body tab once to generate it.' },
      { status: 503 },
    );
  }

  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!provided || provided !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON (HAE "JSON" export format)' }, { status: 400 });
  }

  try {
    const result = await ingestHaePayload(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[health/ingest]', e);
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
  }
}
