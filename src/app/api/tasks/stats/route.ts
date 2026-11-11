import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface DayBucket {
  date: string;
  count: number;
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET() {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const completed = await prisma.task.findMany({
    where: {
      status: 'completed',
      completedAt: { gte: weekStart },
    },
    select: { completedAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    buckets.set(toDayKey(d), 0);
  }
  for (const t of completed) {
    if (!t.completedAt) continue;
    const key = toDayKey(t.completedAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const completedByDay: DayBucket[] = Array.from(buckets.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  let streak = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const count = buckets.get(toDayKey(d)) ?? 0;
    if (count > 0) streak++;
    else break;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAheadEnd = new Date(todayStart);
  weekAheadEnd.setDate(weekAheadEnd.getDate() + 7);

  const [overdue, dueThisWeek, totalPending] = await Promise.all([
    prisma.task.count({
      where: { status: 'pending', dueDate: { lt: todayStart } },
    }),
    prisma.task.count({
      where: { status: 'pending', dueDate: { gte: todayStart, lt: weekAheadEnd } },
    }),
    prisma.task.count({
      where: { status: 'pending' },
    }),
  ]);

  const completedTotal = completedByDay.reduce((s, b) => s + b.count, 0);

  return NextResponse.json({
    completedByDay,
    completedThisWeek: completedTotal,
    streak,
    overdue,
    dueThisWeek,
    totalPending,
  });
}
