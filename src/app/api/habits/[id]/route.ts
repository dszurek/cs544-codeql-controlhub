import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isoDate } from '@/lib/dailyNote';

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
  if (typeof body.name === 'string') data.name = body.name.trim();
  if ('icon' in body) data.icon = typeof body.icon === 'string' ? body.icon : null;
  if ('color' in body) data.color = typeof body.color === 'string' ? body.color : null;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  const habit = await prisma.habit.update({ where: { id }, data });
  return NextResponse.json({ habit });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.habit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Toggle today's entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const date = sp.get('date') || isoDate();
  const existing = await prisma.habitEntry.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });
  if (existing) {
    await prisma.habitEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false });
  }
  await prisma.habitEntry.create({ data: { habitId: id, date } });
  return NextResponse.json({ done: true });
}
