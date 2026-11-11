/**
 * Flow — the deterministic day planner. Pure module: no database, no
 * clock access beyond what's passed in, fully unit-testable.
 *
 * Claude advises (plan_day Cortex job explains the plan); this module
 * decides. Placement uses priority, due pressure, blocker state, and
 * the Body energy curve: deep work lands in predicted peaks, shallow
 * work fills the troughs.
 */
import type { EnergyPoint } from '@/lib/health/metrics';

export interface FlowTask {
  id: string;
  title: string;
  priority: number; // 1 (highest) – 4
  type: string;
  dueDate?: Date | null;
  dueTime?: string | null; // "HH:MM"
  estimatedMinutes?: number | null;
  aiPriority?: boolean;
  blocked?: boolean; // has incomplete blockers — never scheduled
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface PlanInput {
  tasks: FlowTask[];
  busy: BusyInterval[];
  energy: EnergyPoint[]; // empty array → flat energy (no health data yet)
  windowStart: Date;
  windowEnd: Date;
  now: Date;
  examMode?: boolean;
}

export interface PlannedBlock {
  taskId: string;
  start: Date;
  end: Date;
  deep: boolean;
  truncated: boolean;
}

const MIN_BLOCK_MIN = 25;
const MAX_BLOCK_MIN = 180;
const DEFAULT_ESTIMATE_MIN = 30;
const ACADEMIC_TYPES = new Set(['homework', 'exam', 'assignment', 'project', 'lab', 'reading', 'discussion']);

const MS_PER_MIN = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Merge overlapping/adjacent busy intervals, clipped to the window. */
export function mergeBusy(busy: BusyInterval[], windowStart: Date, windowEnd: Date): BusyInterval[] {
  const clipped = busy
    .map((b) => ({
      start: new Date(Math.max(b.start.getTime(), windowStart.getTime())),
      end: new Date(Math.min(b.end.getTime(), windowEnd.getTime())),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: BusyInterval[] = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.start.getTime() <= last.end.getTime()) {
      if (b.end > last.end) last.end = b.end;
    } else {
      merged.push({ start: b.start, end: b.end });
    }
  }
  return merged;
}

/** Free gaps (≥ MIN_BLOCK_MIN) between busy intervals inside the window. */
export function computeGaps(busy: BusyInterval[], windowStart: Date, windowEnd: Date): BusyInterval[] {
  const merged = mergeBusy(busy, windowStart, windowEnd);
  const gaps: BusyInterval[] = [];
  let cursor = windowStart;
  for (const b of merged) {
    if (b.start.getTime() - cursor.getTime() >= MIN_BLOCK_MIN * MS_PER_MIN) {
      gaps.push({ start: cursor, end: b.start });
    }
    if (b.end > cursor) cursor = b.end;
  }
  if (windowEnd.getTime() - cursor.getTime() >= MIN_BLOCK_MIN * MS_PER_MIN) {
    gaps.push({ start: cursor, end: windowEnd });
  }
  return gaps;
}

/** Ordering score: who gets first pick of the day's gaps. */
export function scoreTask(task: FlowTask, now: Date, examMode: boolean): number {
  let score = (5 - task.priority) * 2; // P1 → 8 … P4 → 2
  if (task.dueDate) {
    const days = (task.dueDate.getTime() - now.getTime()) / DAY_MS;
    score += Math.max(0, 5 - days) * 3; // overdue/today ≈ +15, a week out ≈ 0
  }
  if (task.aiPriority) score += 2;
  if (examMode && ACADEMIC_TYPES.has(task.type)) score += 6;
  return score;
}

export function isDeepWork(task: FlowTask): boolean {
  const estimate = task.estimatedMinutes ?? DEFAULT_ESTIMATE_MIN;
  return estimate >= 45 || ACADEMIC_TYPES.has(task.type);
}

/**
 * Mean energy across a block's span, each hour weighted by how many minutes of
 * the block actually fall in it; 0.5 when no curve exists. (Weighting whole
 * hours equally over-counted the trailing hour — a 09:00–10:00 block averaged
 * in hour 10, which lies entirely outside it — nudging deep work later than the
 * curve intends, since `fit` turns on hundredths.)
 */
export function avgEnergy(energy: EnergyPoint[], start: Date, end: Date): number {
  if (energy.length === 0) return 0.5;
  const byHour = new Map(energy.map((p) => [p.hour, p.level]));
  const endMs = end.getTime();
  if (endMs <= start.getTime()) return byHour.get(start.getHours() % 24) ?? 0.5;

  let weighted = 0;
  let totalMin = 0;
  let cursor = start;
  while (cursor.getTime() < endMs) {
    const hour = cursor.getHours();
    const nextBoundary = new Date(
      cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hour + 1, 0, 0, 0,
    ).getTime();
    const segEnd = Math.min(nextBoundary, endMs);
    const minutes = (segEnd - cursor.getTime()) / 60_000;
    weighted += (byHour.get(hour % 24) ?? 0.5) * minutes;
    totalMin += minutes;
    cursor = new Date(segEnd);
  }
  return totalMin === 0 ? 0.5 : weighted / totalMin;
}

interface Candidate {
  gapIndex: number;
  start: Date;
  end: Date;
  fit: number;
  truncated: boolean;
}

function dueDateTime(task: FlowTask): Date | null {
  if (!task.dueDate) return null;
  if (!task.dueTime) return null;
  const [h, m] = task.dueTime.split(':').map(Number);
  const d = new Date(task.dueDate);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export function planDay(input: PlanInput): PlannedBlock[] {
  const { tasks, energy, now, examMode = false } = input;
  const windowStart = new Date(Math.max(input.windowStart.getTime(), now.getTime()));
  const windowEnd = input.windowEnd;
  if (windowEnd <= windowStart) return [];

  let gaps = computeGaps(input.busy, windowStart, windowEnd);

  const eligible = tasks
    .filter((t) => !t.blocked)
    .map((t) => ({ task: t, score: scoreTask(t, now, examMode) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.task.dueDate?.getTime() ?? Infinity) - (b.task.dueDate?.getTime() ?? Infinity),
    );

  const blocks: PlannedBlock[] = [];

  for (const { task } of eligible) {
    const estimate = Math.min(
      Math.max(task.estimatedMinutes ?? DEFAULT_ESTIMATE_MIN, MIN_BLOCK_MIN),
      MAX_BLOCK_MIN,
    );
    const deep = isDeepWork(task);
    const deadline = dueDateTime(task);

    const candidates: Candidate[] = [];
    gaps.forEach((gap, gapIndex) => {
      const gapMin = (gap.end.getTime() - gap.start.getTime()) / MS_PER_MIN;
      if (gapMin < MIN_BLOCK_MIN) return;
      const blockMin = Math.min(estimate, gapMin);
      const truncated = blockMin < estimate;

      // Candidate anchors: gap edges plus hourly steps inside the gap,
      // so mid-gap energy peaks/troughs are actually reachable.
      const lastStart = gap.end.getTime() - blockMin * MS_PER_MIN;
      const anchorTimes = new Set<number>([gap.start.getTime(), lastStart]);
      for (
        let t = gap.start.getTime() + 60 * MS_PER_MIN;
        t < lastStart && anchorTimes.size < 18;
        t += 60 * MS_PER_MIN
      ) {
        anchorTimes.add(t);
      }
      for (const startMs of anchorTimes) {
        const start = new Date(startMs);
        const end = new Date(start.getTime() + blockMin * MS_PER_MIN);
        if (deadline && end > deadline) continue; // must finish before it's due
        const e = avgEnergy(energy, start, end);
        let fit = deep ? e : 1 - e;
        if (truncated) fit -= 0.3;
        // Slight earliness preference keeps plans intuitive and stable.
        const dayFrac =
          (start.getTime() - windowStart.getTime()) /
          Math.max(windowEnd.getTime() - windowStart.getTime(), 1);
        fit -= dayFrac * 0.1;
        candidates.push({ gapIndex, start, end, fit, truncated });
      }
    });

    // Deadline pressure overrides energy fit: if it's due today, earliest wins ties harder.
    candidates.sort((a, b) => b.fit - a.fit || a.start.getTime() - b.start.getTime());
    let chosen = candidates[0] ?? null;

    // Nothing satisfies the deadline → schedule earliest possible anyway (late > never).
    if (!chosen && deadline) {
      const gap = gaps.find(
        (g) => (g.end.getTime() - g.start.getTime()) / MS_PER_MIN >= MIN_BLOCK_MIN,
      );
      if (gap) {
        const blockMin = Math.min(estimate, (gap.end.getTime() - gap.start.getTime()) / MS_PER_MIN);
        chosen = {
          gapIndex: gaps.indexOf(gap),
          start: gap.start,
          end: new Date(gap.start.getTime() + blockMin * MS_PER_MIN),
          fit: 0,
          truncated: blockMin < estimate,
        };
      }
    }

    if (!chosen) continue;

    blocks.push({
      taskId: task.id,
      start: chosen.start,
      end: chosen.end,
      deep,
      truncated: chosen.truncated,
    });

    // Split the consumed gap.
    const gap = gaps[chosen.gapIndex];
    const remainder: BusyInterval[] = [];
    if (chosen.start.getTime() - gap.start.getTime() >= MIN_BLOCK_MIN * MS_PER_MIN) {
      remainder.push({ start: gap.start, end: chosen.start });
    }
    if (gap.end.getTime() - chosen.end.getTime() >= MIN_BLOCK_MIN * MS_PER_MIN) {
      remainder.push({ start: chosen.end, end: gap.end });
    }
    gaps = [...gaps.slice(0, chosen.gapIndex), ...remainder, ...gaps.slice(chosen.gapIndex + 1)];
    gaps.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  return blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
}
