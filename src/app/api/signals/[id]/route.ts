import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const signal = await prisma.signal.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });
    return NextResponse.json({ signal });
  } catch (e) {
    console.error('[signals/dismiss]', e);
    return NextResponse.json({ error: 'Failed to dismiss signal' }, { status: 500 });
  }
}
