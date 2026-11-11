import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const items = await prisma.somedayItem.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { title, notes } = body;
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  const item = await prisma.somedayItem.create({
    data: { title: title.trim(), notes: typeof notes === 'string' ? notes : null },
  });
  return NextResponse.json({ item });
}
