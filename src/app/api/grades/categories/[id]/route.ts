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
  if (typeof body.weight === 'number') data.weight = body.weight;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  const updated = await prisma.gradeCategory.update({ where: { id }, data });
  return NextResponse.json({ category: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.gradeCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
