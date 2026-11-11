import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncAssignmentToTask } from '@/lib/gradeTaskSync';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const {
    classId,
    categoryId,
    name,
    pointsEarned,
    pointsPossible,
    dueDate,
    isUpcoming,
  } = body;
  if (typeof classId !== 'string' || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'classId and name required' }, { status: 400 });
  }
  const created = await prisma.gradeAssignment.create({
    data: {
      classId,
      categoryId: typeof categoryId === 'string' && categoryId ? categoryId : null,
      name: name.trim(),
      pointsEarned: typeof pointsEarned === 'number' ? pointsEarned : null,
      pointsPossible: typeof pointsPossible === 'number' ? pointsPossible : 100,
      dueDate: typeof dueDate === 'string' ? new Date(dueDate) : null,
      isUpcoming: Boolean(isUpcoming),
    },
  });
  await syncAssignmentToTask(created.id);
  return NextResponse.json({ assignment: created });
}
