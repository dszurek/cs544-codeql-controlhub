import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/** Pin/unpin or manually move a block. Moving marks it manual (Flow won't touch it). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.pinned === 'boolean') data.blockPinned = body.pinned;
    if (typeof body.start === 'string' && typeof body.end === 'string') {
      const start = new Date(body.start);
      const end = new Date(body.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json({ error: 'Invalid block times' }, { status: 400 });
      }
      data.blockStart = start;
      data.blockEnd = end;
      data.blockSource = 'manual';
    }
    if (body.clear === true) {
      data.blockStart = null;
      data.blockEnd = null;
      data.blockSource = null;
      data.blockPinned = false;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const task = await prisma.task.update({ where: { id: taskId }, data });
    return NextResponse.json({ task });
  } catch (e) {
    console.error('[flow/blocks]', e);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}
