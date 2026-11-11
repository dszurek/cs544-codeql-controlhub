import { prisma } from './db';

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIds(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function getTodayShutdownLog() {
  const row = await prisma.shutdownLog.findUnique({ where: { date: todayKey() } });
  if (!row) return null;
  return {
    ...row,
    incompleteTaskIds: parseIds(row.incompleteTaskIds),
    tomorrowTopIds: parseIds(row.tomorrowTopIds),
  };
}

export async function saveShutdownLog(data: {
  incompleteTaskIds: string[];
  tomorrowTopIds: string[];
  journal?: string;
}) {
  const date = todayKey();
  const payload = {
    date,
    incompleteTaskIds: JSON.stringify(data.incompleteTaskIds),
    tomorrowTopIds: JSON.stringify(data.tomorrowTopIds),
    journal: data.journal ?? null,
  };
  await prisma.shutdownLog.upsert({
    where: { date },
    update: payload,
    create: payload,
  });
  return getTodayShutdownLog();
}

export async function getShutdownContext() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);

  const [incomplete, tomorrow] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: 'pending',
        dueDate: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { priority: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        status: 'pending',
        dueDate: { gte: todayEnd, lt: tomorrowEnd },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return {
    incompleteToday: incomplete,
    tomorrowTop: tomorrow.slice(0, 3),
  };
}
