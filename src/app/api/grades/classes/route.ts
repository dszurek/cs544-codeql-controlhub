import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { summarizeClass, overallGpa } from '@/lib/grades';

export async function GET() {
  const classes = await prisma.gradeClass.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { categories: true, assignments: true },
  });
  const summaries = classes.map((c) =>
    summarizeClass(c, c.categories, c.assignments),
  );
  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      creditHours: c.creditHours,
      qualityPoints: c.qualityPoints,
      categories: c.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        weight: cat.weight,
      })),
      assignments: c.assignments.map((a) => ({
        id: a.id,
        name: a.name,
        categoryId: a.categoryId,
        pointsEarned: a.pointsEarned,
        pointsPossible: a.pointsPossible,
        dueDate: a.dueDate,
        isUpcoming: a.isUpcoming,
      })),
    })),
    summaries,
    gpa: overallGpa(summaries),
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, code, creditHours, qualityPoints } = body;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  const created = await prisma.gradeClass.create({
    data: {
      name: name.trim(),
      code: typeof code === 'string' ? code : null,
      creditHours: typeof creditHours === 'number' ? creditHours : 3,
      qualityPoints: typeof qualityPoints === 'number' ? qualityPoints : 0,
    },
  });
  return NextResponse.json({ class: created });
}
