import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getEvents } from '@/lib/calendar';
import { getHealthSummary } from '@/lib/health/ingest';
import { planDay, type FlowTask, type BusyInterval } from './scheduler';

const DAY_MS = 24 * 60 * 60 * 1000;

function todayAt(hhmm: string, fallback: string): Date {
  const raw = /^\d{1,2}:\d{2}$/.test(hhmm) ? hhmm : fallback;
  const [h, m] = raw.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export interface FlowBlock {
  taskId: string;
  title: string;
  priority: number;
  type: string;
  start: string;
  end: string;
  pinned: boolean;
  source: string;
}

export async function getTodayBlocks(): Promise<FlowBlock[]> {
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day24 = new Date(day0.getTime() + DAY_MS);

  const tasks = await prisma.task.findMany({
    where: { status: 'pending', blockStart: { gte: day0, lt: day24 }, blockEnd: { not: null } },
    orderBy: { blockStart: 'asc' },
  });

  return tasks.map((t) => ({
    taskId: t.id,
    title: t.title,
    priority: t.priority,
    type: t.type,
    start: (t.blockStart as Date).toISOString(),
    end: (t.blockEnd as Date).toISOString(),
    pinned: t.blockPinned || (t.blockSource !== 'flow' && t.blockSource !== null),
    source: t.blockSource ?? 'manual',
  }));
}

/**
 * Reflow today: clear unpinned flow blocks, treat events + pinned/manual
 * blocks as busy, and place the most pressing tasks into the gaps.
 */
export async function replanToday(): Promise<FlowBlock[]> {
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day24 = new Date(day0.getTime() + DAY_MS);

  const settings = await getSettings(['flow_day_start', 'flow_day_end', 'exam_mode']);
  const windowStart = todayAt(settings.flow_day_start ?? '', '08:00');
  const windowEnd = todayAt(settings.flow_day_end ?? '', '22:00');
  const examMode = settings.exam_mode === 'on';

  // Candidates: pending top-level tasks that are pressing.
  const horizon = new Date(now.getTime() + 7 * DAY_MS);
  const raw = await prisma.task.findMany({
    where: {
      status: 'pending',
      parentId: null,
      AND: [
        { OR: [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }] },
        { OR: [{ dueDate: { lte: horizon } }, { priority: { lte: 2 } }, { aiPriority: true }] },
      ],
    },
    include: { blockedBy: { include: { blocker: true } } },
    orderBy: { dueDate: 'asc' },
    take: 40,
  });

  const isToday = (d: Date | null) => d !== null && d >= day0 && d < day24;
  const keepsBlock = (t: (typeof raw)[number]) =>
    isToday(t.blockStart) && t.blockEnd !== null && (t.blockPinned || t.blockSource !== 'flow');

  // Fetch events BEFORE clearing anything. A calendar fetch failure (routine
  // for iCloud/Outlook) must not wipe the day's plan with nothing to replace it.
  const events = await getEvents({ startDate: day0, endDate: day24 });
  const busy: BusyInterval[] = events
    .filter((e) => !e.allDay)
    .map((e) => ({ start: e.startAt, end: e.endAt }));
  for (const t of raw.filter(keepsBlock)) {
    busy.push({ start: t.blockStart as Date, end: t.blockEnd as Date });
  }

  const flowTasks: FlowTask[] = raw
    .filter((t) => !keepsBlock(t))
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      type: t.type,
      dueDate: t.dueDate,
      dueTime: t.dueTime,
      estimatedMinutes: t.estimatedMinutes,
      aiPriority: t.aiPriority,
      blocked: t.blockedBy.some((b) => b.blocker.status !== 'completed' && b.blocker.status !== 'cancelled'),
    }));

  let energy: Awaited<ReturnType<typeof getHealthSummary>>['energy'] = [];
  try {
    const summary = await getHealthSummary();
    if (summary.hasData) energy = summary.energy;
  } catch { /* plan without the curve */ }

  const blocks = planDay({ tasks: flowTasks, busy, energy, windowStart, windowEnd, now, examMode });

  // Clear the old unpinned flow blocks and write the new ones in ONE
  // transaction: the plan is only ever destroyed if its replacement commits.
  await prisma.$transaction([
    prisma.task.updateMany({
      where: {
        blockSource: 'flow',
        blockPinned: false,
        blockStart: { gte: day0, lt: day24 },
      },
      data: { blockStart: null, blockEnd: null, blockSource: null },
    }),
    ...blocks.map((b) =>
      prisma.task.update({
        where: { id: b.taskId },
        data: { blockStart: b.start, blockEnd: b.end, blockSource: 'flow' },
      }),
    ),
  ]);

  return getTodayBlocks();
}
