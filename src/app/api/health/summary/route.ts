import { NextResponse } from 'next/server';
import { getHealthSummary } from '@/lib/health/ingest';

export async function GET() {
  try {
    const summary = await getHealthSummary();
    return NextResponse.json(summary);
  } catch (e) {
    console.error('[health/summary]', e);
    return NextResponse.json({ error: 'Failed to load health summary' }, { status: 500 });
  }
}
