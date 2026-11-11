import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const overdue = await prisma.task.findMany({
    where: {
      dueDate: { lt: startOfToday },
      status: { in: ['pending', 'in_progress'] },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 20,
  });

  const stalled = await prisma.task.findMany({
    where: {
      status: 'in_progress',
      createdAt: { lt: threeDaysAgo },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const stalledIds = new Set(stalled.map((t) => t.id));
  const overdueOnly = overdue.filter((t) => !stalledIds.has(t.id));

  return NextResponse.json({
    overdue: overdueOnly,
    stalled,
  });
}
