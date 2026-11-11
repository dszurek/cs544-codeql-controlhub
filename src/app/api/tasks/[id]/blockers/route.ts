import { NextRequest, NextResponse } from 'next/server';
import { addBlocker, removeBlocker } from '@/lib/taskRelations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.blockerId !== 'string') {
    return NextResponse.json({ error: 'blockerId required' }, { status: 400 });
  }
  try {
    const link = await addBlocker(id, body.blockerId);
    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add blocker' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const blockerId = request.nextUrl.searchParams.get('blockerId');
  if (!blockerId) {
    return NextResponse.json({ error: 'blockerId query param required' }, { status: 400 });
  }
  await removeBlocker(id, blockerId);
  return NextResponse.json({ ok: true });
}
