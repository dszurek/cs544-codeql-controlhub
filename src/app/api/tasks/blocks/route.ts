import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const startParam = sp.get('start');
  const endParam = sp.get('end');
  if (!startParam || !endParam) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 });
  }
  const start = new Date(startParam);
  const end = new Date(endParam);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'invalid dates' }, { status: 400 });
  }

  const blocks = await prisma.task.findMany({
    where: {
      blockStart: { lt: end },
      blockEnd: { gt: start },
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      blockStart: true,
      blockEnd: true,
    },
    orderBy: { blockStart: 'asc' },
  });

  return NextResponse.json({ blocks });
}
