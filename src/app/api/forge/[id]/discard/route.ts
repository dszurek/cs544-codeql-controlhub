import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { discardForge } from '@/lib/forge/runner';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await discardForge(id);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (e) {
    console.error('[forge/discard]', e);
    return NextResponse.json({ ok: false, error: 'Discard failed' }, { status: 500 });
  }
}
