/**
 * Parser for Health Auto Export's JSON payload ("REST API" export).
 * Pure module — no database access — so the format handling is testable.
 *
 * Payload shape (tolerant — HAE varies fields by metric):
 * {
 *   data: {
 *     metrics: [{ name, units, data: [{ date, qty | Avg | asleep… , source? }] }],
 *     workouts: [{ name, start, end, duration?, activeEnergyBurned?, distance?, avgHeartRate?, maxHeartRate? }]
 *   }
 * }
 */

export interface ParsedSample {
  type: string;
  value: number;
  unit: string | null;
  startDate: Date;
  endDate: Date;
  source: string | null;
  metadata: string | null;
}

export interface ParsedWorkout {
  type: string;
  startDate: Date;
  endDate: Date;
  duration: number | null; // minutes
  energy: number | null;   // kcal
  distance: number | null; // km
  avgHr: number | null;
  maxHr: number | null;
  metadata: string | null;
}

export interface ParsedPayload {
  samples: ParsedSample[];
  workouts: ParsedWorkout[];
}

/** HAE dates look like "2026-06-12 06:30:00 -0500". */
export function parseHaeDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw) return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.\d+)? ([+-]\d{2}):?(\d{2})$/);
  const iso = m ? `${m[1]}T${m[2]}${m[3]}:${m[4]}` : raw;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object' && v !== null && 'qty' in v) return num((v as { qty: unknown }).qty);
  return null;
}

interface RawPoint { [key: string]: unknown }

/** Sleep stage fields HAE reports (hours, usually) → sample types. */
const SLEEP_STAGES: Array<[field: string, type: string]> = [
  ['asleep', 'sleep_asleep'],
  ['deep', 'sleep_deep'],
  ['rem', 'sleep_rem'],
  ['core', 'sleep_core'],
  ['awake', 'sleep_awake'],
  ['inBed', 'sleep_inbed'],
];

function parseSleepPoint(point: RawPoint, units: string | null): ParsedSample[] {
  const start = parseHaeDate(point.sleepStart) ?? parseHaeDate(point.date);
  const end = parseHaeDate(point.sleepEnd) ?? parseHaeDate(point.date);
  if (!start || !end) return [];
  const source = typeof point.source === 'string' ? point.source : null;
  const out: ParsedSample[] = [];
  for (const [field, type] of SLEEP_STAGES) {
    const value = num(point[field]);
    if (value === null) continue;
    out.push({ type, value, unit: units, startDate: start, endDate: end, source, metadata: null });
  }
  return out;
}

function parseMetricPoint(name: string, units: string | null, point: RawPoint): ParsedSample[] {
  const date = parseHaeDate(point.date);
  if (!date) return [];
  const source = typeof point.source === 'string' ? point.source : null;

  // Plain quantity ({ qty }) or aggregate ({ Min, Avg, Max })
  const qty = num(point.qty) ?? num(point.Avg) ?? num(point.avg);
  if (qty === null) return [];

  const hasAgg = point.Min !== undefined || point.Max !== undefined;
  const metadata = hasAgg
    ? JSON.stringify({ min: num(point.Min), max: num(point.Max) })
    : null;

  return [{ type: name, value: qty, unit: units, startDate: date, endDate: date, source, metadata }];
}

function parseWorkout(raw: RawPoint): ParsedWorkout | null {
  const start = parseHaeDate(raw.start);
  const end = parseHaeDate(raw.end);
  const type = typeof raw.name === 'string' ? raw.name : null;
  if (!start || !end || !type) return null;

  // Derive duration from the actual start→end span rather than the `duration`
  // field, whose unit varies between HAE versions (seconds vs minutes). The old
  // "anything ≤960 is minutes" heuristic stored a 15-minute walk reported in
  // seconds (900) as 900 *minutes*. The span is unambiguous; fall back to the
  // raw field only if the span is non-positive (bad data).
  const spanMin = (end.getTime() - start.getTime()) / 60_000;
  const durationRaw = num(raw.duration);
  return {
    type,
    startDate: start,
    endDate: end,
    duration:
      spanMin > 0
        ? spanMin
        : durationRaw === null
          ? null
          : durationRaw > 960
            ? durationRaw / 60
            : durationRaw,
    energy: num(raw.activeEnergyBurned) ?? num(raw.activeEnergy),
    distance: num(raw.distance),
    avgHr: num(raw.avgHeartRate),
    maxHr: num(raw.maxHeartRate),
    metadata: null,
  };
}

export function parseHaePayload(payload: unknown): ParsedPayload {
  const samples: ParsedSample[] = [];
  const workouts: ParsedWorkout[] = [];

  const data = (payload as { data?: { metrics?: unknown; workouts?: unknown } } | null)?.data;
  const metrics = Array.isArray(data?.metrics) ? data.metrics : [];
  const rawWorkouts = Array.isArray(data?.workouts) ? data.workouts : [];

  for (const metric of metrics) {
    const name = typeof metric?.name === 'string' ? metric.name : null;
    if (!name) continue;
    const units = typeof metric?.units === 'string' ? metric.units : null;
    const points: RawPoint[] = Array.isArray(metric?.data) ? metric.data : [];
    for (const point of points) {
      if (name === 'sleep_analysis') samples.push(...parseSleepPoint(point, units));
      else samples.push(...parseMetricPoint(name, units, point));
    }
  }

  for (const raw of rawWorkouts) {
    const w = parseWorkout(raw as RawPoint);
    if (w) workouts.push(w);
  }

  return { samples, workouts };
}
