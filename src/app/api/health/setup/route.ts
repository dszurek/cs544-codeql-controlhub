import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSetting, setSetting } from '@/lib/settings';

/**
 * Returns (generating on first call) the bearer token Health Auto Export
 * uses against /api/health/ingest. Session-protected like every other
 * route, so only a logged-in user can read it.
 */
export async function GET() {
  try {
    let token = await getSetting('health_ingest_token');
    if (!token) {
      token = randomBytes(24).toString('hex');
      await setSetting('health_ingest_token', token);
    }
    return NextResponse.json({ token, path: '/api/health/ingest' });
  } catch (e) {
    console.error('[health/setup]', e);
    return NextResponse.json({ error: 'Failed to prepare ingestion token' }, { status: 500 });
  }
}
