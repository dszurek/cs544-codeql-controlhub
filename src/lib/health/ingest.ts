import { prisma } from '@/lib/db';
import { parseHaePayload, type ParsedSample } from './hae';
import {
  computeBaselines,
  computeSleepDebt,
  computeReadiness,
  energyCurve,
  type Baselines,
  type EnergyPoint,
} from './metrics';

const DAY_MS = 24 * 60 * 60 * 1000;
const SLEEP_TYPES = ['sleep_asleep', 'sleep_deep', 'sleep_rem', 'sleep_core', 'sleep_awake', 'sleep_inbed'];

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Sleep belongs to the day you woke up; everything else to its own day. */
function dayFor(sample: ParsedSample): Date {
  const anchor = sample.type.startsWith('sleep_') ? sample.endDate : sample.startDate;
  return localMidnight(anchor);
}

/** HAE reports sleep in hours; rollups store minutes. */
function toMinutes(value: number, unit: string | null): number {
  if (unit && unit.toLowerCase().startsWith('hr')) return value * 60;
  if (unit && unit.toLowerCase().startsWith('min')) return value;
  // sleep without a unit: HAE convention is hours
  return value * 60;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

export interface IngestResult {
  samples: number;
  workouts: number;
  days: string[];
}

export async function ingestHaePayload(payload: unknown): Promise<IngestResult> {
  const { samples, workouts } = parseHaePayload(payload);

  // A single HAE export is routinely thousands of samples. One awaited upsert
  // apiece is a separate commit/fsync each — minutes on a Pi's SD card, long
  // enough for the iOS Shortcut to time out and retry. Batch into chunked
  // transactions so each chunk is one commit, keeping upsert semantics.
  const CHUNK = 200;
  for (let i = 0; i < samples.length; i += CHUNK) {
    await prisma.$transaction(
      samples.slice(i, i + CHUNK).map((s) =>
        prisma.healthSample.upsert({
          where: { type_startDate_endDate: { type: s.type, startDate: s.startDate, endDate: s.endDate } },
          update: { value: s.value, unit: s.unit, source: s.source, metadata: s.metadata },
          create: s,
        }),
      ),
    );
  }

  for (let i = 0; i < workouts.length; i += CHUNK) {
    await prisma.$transaction(
      workouts.slice(i, i + CHUNK).map((w) =>
        prisma.workout.upsert({
          where: { type_startDate_endDate: { type: w.type, startDate: w.startDate, endDate: w.endDate } },
          update: { duration: w.duration, energy: w.energy, distance: w.distance, avgHr: w.avgHr, maxHr: w.maxHr },
          create: w,
        }),
      ),
    );
  }

  const days = [...new Set(samples.map((s) => dayFor(s).getTime()))].sort((a, b) => a - b);
  for (const t of days) await rollupDay(new Date(t));
  for (const t of days) await recomputeDerived(new Date(t));

  return {
    samples: samples.length,
    workouts: workouts.length,
    days: days.map((t) => new Date(t).toISOString().slice(0, 10)),
  };
}

/** Aggregate raw samples for one local day into a HealthDaily row. */
export async function rollupDay(day: Date): Promise<void> {
  const next = new Date(day.getTime() + DAY_MS);

  const sleep = await prisma.healthSample.findMany({
    where: { type: { in: SLEEP_TYPES }, endDate: { gte: day, lt: next } },
  });
  const rest = await prisma.healthSample.findMany({
    where: { type: { notIn: SLEEP_TYPES }, startDate: { gte: day, lt: next } },
  });

  const stageMin = (type: string) =>
    sum(sleep.filter((s) => s.type === type).map((s) => toMinutes(s.value, s.unit)));
  const values = (type: string) => rest.filter((s) => s.type === type).map((s) => s.value);

  const sleepMinutes = stageMin('sleep_asleep');
  const fields = {
    sleepMinutes: sleepMinutes || null,
    sleepDeepMin: stageMin('sleep_deep') || null,
    sleepRemMin: stageMin('sleep_rem') || null,
    sleepCoreMin: stageMin('sleep_core') || null,
    sleepAwakeMin: stageMin('sleep_awake') || null,
    hrvMs: avg(values('heart_rate_variability')),
    restingHr: avg(values('resting_heart_rate')),
    steps: values('step_count').length ? sum(values('step_count')) : null,
    activeEnergy: values('active_energy').length ? sum(values('active_energy')) : null,
    exerciseMinutes: values('apple_exercise_time').length ? sum(values('apple_exercise_time')) : null,
    respRate: avg(values('respiratory_rate')),
  };

  await prisma.healthDaily.upsert({
    where: { date: day },
    update: fields,
    create: { date: day, ...fields },
  });
}

/** Recompute baselines-relative metrics (debt, readiness) for one day. */
export async function recomputeDerived(day: Date): Promise<void> {
  const daily = await prisma.healthDaily.findUnique({ where: { date: day } });
  if (!daily) return;

  const prev30 = await prisma.healthDaily.findMany({
    where: { date: { lt: day } },
    orderBy: { date: 'desc' },
    take: 30,
  });
  const base = computeBaselines(prev30);

  const since = new Date(day.getTime() - 13 * DAY_MS);
  const last14 = await prisma.healthDaily.findMany({
    where: { date: { gte: since, lte: day } },
    orderBy: { date: 'asc' },
  });
  const sleepDebtMin = computeSleepDebt(last14.map((d) => d.sleepMinutes), base.sleepNeedMin);

  const readiness = computeReadiness(
    { hrvMs: daily.hrvMs, restingHr: daily.restingHr, sleepMinutes: daily.sleepMinutes, sleepDebtMin },
    base,
  );

  await prisma.healthDaily.update({ where: { date: day }, data: { sleepDebtMin, readiness } });
}

export interface HealthSummary {
  hasData: boolean;
  latest: {
    date: string;
    readiness: number | null;
    sleepDebtMin: number | null;
    sleepMinutes: number | null;
    hrvMs: number | null;
    restingHr: number | null;
    steps: number | null;
    activeEnergy: number | null;
  } | null;
  baselines: Baselines | null;
  trend: Array<{
    date: string;
    sleepMinutes: number | null;
    hrvMs: number | null;
    restingHr: number | null;
    readiness: number | null;
  }>;
  energy: EnergyPoint[];
  wakeHour: number;
  sampleCount: number;
  since: string | null;
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const latest = await prisma.healthDaily.findFirst({ orderBy: { date: 'desc' } });
  const sampleCount = await prisma.healthSample.count();

  if (!latest || sampleCount === 0) {
    return {
      hasData: false,
      latest: null,
      baselines: null,
      trend: [],
      energy: [],
      wakeHour: 7,
      sampleCount,
      since: null,
    };
  }

  const trendRows = await prisma.healthDaily.findMany({
    orderBy: { date: 'desc' },
    take: 14,
  });
  const base30 = await prisma.healthDaily.findMany({
    orderBy: { date: 'desc' },
    take: 30,
  });

  const lastSleep = await prisma.healthSample.findFirst({
    where: { type: 'sleep_asleep' },
    orderBy: { endDate: 'desc' },
  });
  const wakeHour = lastSleep
    ? lastSleep.endDate.getHours() + lastSleep.endDate.getMinutes() / 60
    : 7;

  const first = await prisma.healthSample.findFirst({ orderBy: { startDate: 'asc' } });

  return {
    hasData: true,
    latest: {
      date: latest.date.toISOString().slice(0, 10),
      readiness: latest.readiness,
      sleepDebtMin: latest.sleepDebtMin,
      sleepMinutes: latest.sleepMinutes,
      hrvMs: latest.hrvMs,
      restingHr: latest.restingHr,
      steps: latest.steps,
      activeEnergy: latest.activeEnergy,
    },
    baselines: computeBaselines(base30),
    trend: trendRows.reverse().map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      sleepMinutes: d.sleepMinutes,
      hrvMs: d.hrvMs,
      restingHr: d.restingHr,
      readiness: d.readiness,
    })),
    energy: energyCurve(Math.round(wakeHour * 2) / 2, latest.sleepDebtMin ?? 0),
    wakeHour,
    sampleCount,
    since: first ? first.startDate.toISOString().slice(0, 10) : null,
  };
}
