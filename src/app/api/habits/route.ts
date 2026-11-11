import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isoDate } from '@/lib/dailyNote';

export async function GET() {
  const habits = await prisma.habit.findMany({ orderBy: { sortOrder: 'asc' } });
  const today = isoDate();
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 29);
  const entries = await prisma.habitEntry.findMany({
    where: {
      date: {
        gte: `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}-${String(windowStart.getDate()).padStart(2, '0')}`,
      },
    },
  });
  const byHabit: Record<string, string[]> = {};
  for (const e of entries) {
    (byHabit[e.habitId] ||= []).push(e.date);
  }
  const withStats = habits.map((h) => {
    const dates = new Set(byHabit[h.id] ?? []);
    const days: Array<{ date: string; done: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, done: dates.has(iso) });
    }
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dates.has(iso)) streak++;
      else if (iso !== today) break;
      else break;
    }
    return { ...h, days, streak, doneToday: dates.has(today) };
  });
  return NextResponse.json({ habits: withStats });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, icon, color } = body;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  const count = await prisma.habit.count();
  const habit = await prisma.habit.create({
    data: {
      name: name.trim(),
      icon: typeof icon === 'string' ? icon : null,
      color: typeof color === 'string' ? color : null,
      sortOrder: count,
    },
  });
  return NextResponse.json({ habit });
}
