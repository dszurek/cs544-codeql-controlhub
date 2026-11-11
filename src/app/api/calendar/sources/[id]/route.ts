import { NextRequest, NextResponse } from 'next/server';
import { updateCalendarSource, deleteCalendarSource } from '@/lib/calendarSources';
import { prisma } from '@/lib/db';
import { sourceTag } from '@/lib/calendarSources';

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

  const data: Parameters<typeof updateCalendarSource>[1] = {};
  if (typeof body.label === 'string') data.label = body.label.trim() || null;
  if (body.label === null) data.label = null;
  if (typeof body.color === 'string') data.color = body.color.trim() || null;
  if (body.color === null) data.color = null;
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;

  try {
    const source = await updateCalendarSource(id, data);
    return NextResponse.json({ source });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.calendarEvent.deleteMany({ where: { source: sourceTag(id) } });
    await deleteCalendarSource(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
