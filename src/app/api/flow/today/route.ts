import { NextResponse } from 'next/server';
import { getTodayBlocks } from '@/lib/flow';

export async function GET() {
  try {
    const blocks = await getTodayBlocks();
    return NextResponse.json({ blocks });
  } catch (e) {
    console.error('[flow/today]', e);
    return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 });
  }
}
