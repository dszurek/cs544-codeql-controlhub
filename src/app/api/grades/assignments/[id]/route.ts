import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { removeAssignmentTask, syncAssignmentToTask } from '@/lib/gradeTaskSync';

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
  if ('categoryId' in body) {
    data.categoryId = typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : null;
  }
  if ('pointsEarned' in body) {
    data.pointsEarned = typeof body.pointsEarned === 'number' ? body.pointsEarned : null;
  }
  if (typeof body.pointsPossible === 'number') data.pointsPossible = body.pointsPossible;
  if ('dueDate' in body) {
    data.dueDate = typeof body.dueDate === 'string' ? new Date(body.dueDate) : null;
  }
  if (typeof body.isUpcoming === 'boolean') data.isUpcoming = body.isUpcoming;
  const updated = await prisma.gradeAssignment.update({ where: { id }, data });
  await syncAssignmentToTask(id);
  return NextResponse.json({ assignment: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeAssignmentTask(id);
  await prisma.gradeAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
