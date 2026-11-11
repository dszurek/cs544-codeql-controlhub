import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
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
  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if ('notes' in body) data.notes = typeof body.notes === 'string' ? body.notes : null;
  const item = await prisma.somedayItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.somedayItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Promote someday → task
  const { id } = await params;
  const item = await prisma.somedayItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (item.promotedTaskId) {
    return NextResponse.json({ error: 'already promoted' }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title: item.title,
      notes: item.notes,
      type: 'general',
      priority: 4,
      source: 'someday',
    },
  });
  await prisma.somedayItem.update({
    where: { id },
    data: { promotedTaskId: task.id, promotedAt: new Date() },
  });
  return NextResponse.json({ task });
}
