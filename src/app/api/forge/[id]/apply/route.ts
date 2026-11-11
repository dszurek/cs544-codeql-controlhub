import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applyForge } from '@/lib/forge/runner';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const res = await applyForge(id, body.force === true);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (e) {
    console.error('[forge/apply]', e);
    return NextResponse.json({ ok: false, error: 'Apply failed' }, { status: 500 });
  }
}
