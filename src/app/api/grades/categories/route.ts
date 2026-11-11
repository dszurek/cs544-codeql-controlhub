import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { classId, name, weight } = body;
  if (typeof classId !== 'string' || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'classId and name required' }, { status: 400 });
  }
  const created = await prisma.gradeCategory.create({
    data: {
      classId,
      name: name.trim(),
      weight: typeof weight === 'number' ? weight : 0,
    },
  });
  return NextResponse.json({ category: created });
}
