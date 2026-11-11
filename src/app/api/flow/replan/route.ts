import { NextResponse } from 'next/server';
import { replanToday } from '@/lib/flow';

export async function POST() {
  try {
    const blocks = await replanToday();
    return NextResponse.json({ blocks });
  } catch (e) {
    console.error('[flow/replan]', e);
    return NextResponse.json({ error: 'Replan failed' }, { status: 500 });
  }
}
