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
  if (typeof body.name === 'string') data.name = body.name.trim();
  if ('code' in body) data.code = typeof body.code === 'string' ? body.code : null;
  if (typeof body.creditHours === 'number') data.creditHours = body.creditHours;
  if (typeof body.qualityPoints === 'number') data.qualityPoints = body.qualityPoints;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  const updated = await prisma.gradeClass.update({ where: { id }, data });
  return NextResponse.json({ class: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.gradeClass.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
