/**
 * Derived health metrics — deterministic and transparent (the formulas
 * Whoop/Rise charge for, except you can read and tune them).
 * Pure module — no database access.
 */

export interface DailyLike {
  date: Date;
  sleepMinutes?: number | null;
  hrvMs?: number | null;
  restingHr?: number | null;
}

export interface Baselines {
  hrvMs: number | null;       // 30-day mean
  restingHr: number | null;   // 30-day mean
  sleepNeedMin: number;       // 30-day mean sleep, clamped to a sane band
  dataDays: number;
}

const SLEEP_NEED_DEFAULT = 480; // 8h until we know better
const SLEEP_NEED_MIN = 390;
const SLEEP_NEED_MAX = 570;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Personal baselines from up to 30 days of rollups. */
export function computeBaselines(dailies: DailyLike[]): Baselines {
  const hrv = dailies.map((d) => d.hrvMs).filter((v): v is number => v != null);
  const rhr = dailies.map((d) => d.restingHr).filter((v): v is number => v != null);
  const sleep = dailies.map((d) => d.sleepMinutes).filter((v): v is number => v != null);

  const sleepMean = mean(sleep);
  const sleepNeedMin =
    sleep.length >= 5 && sleepMean !== null
      ? Math.min(SLEEP_NEED_MAX, Math.max(SLEEP_NEED_MIN, sleepMean))
      : SLEEP_NEED_DEFAULT;

  return {
    hrvMs: mean(hrv),
    restingHr: mean(rhr),
    sleepNeedMin,
    dataDays: dailies.length,
  };
}

/**
 * Rolling sleep debt over the last 14 nights: deficits accumulate,
 * surpluses repay, the total never goes negative.
 */
export function computeSleepDebt(last14SleepMin: Array<number | null>, needMin: number): number {
  let debt = 0;
  for (const slept of last14SleepMin) {
    if (slept == null) continue; // missing night: no evidence either way
    debt = Math.max(0, debt + (needMin - slept));
  }
  return Math.round(debt);
}

export interface ReadinessInput {
  hrvMs?: number | null;
  restingHr?: number | null;
  sleepMinutes?: number | null;
  sleepDebtMin?: number | null;
}

/**
 * Readiness 0–100. Weighted components, each 0–1, renormalized over
 * whatever data exists today:
 *   HRV vs baseline      (35%) — ±50% swing maps to 0..1
 *   RHR vs baseline      (20%) — lower is better, ±20% swing
 *   last night vs need   (30%)
 *   14-day sleep debt    (15%) — 0 at 10h of debt
 * Needs at least one component and a few days of baseline to be meaningful.
 */
export function computeReadiness(today: ReadinessInput, base: Baselines): number | null {
  const parts: Array<{ w: number; score: number }> = [];

  if (today.hrvMs != null && base.hrvMs != null && base.hrvMs > 0) {
    parts.push({ w: 0.35, score: clamp01(0.5 + (today.hrvMs - base.hrvMs) / base.hrvMs) });
  }
  if (today.restingHr != null && base.restingHr != null && base.restingHr > 0) {
    parts.push({ w: 0.2, score: clamp01(0.5 + ((base.restingHr - today.restingHr) / base.restingHr) * 2.5) });
  }
  if (today.sleepMinutes != null) {
    parts.push({ w: 0.3, score: clamp01(today.sleepMinutes / base.sleepNeedMin) });
  }
  if (today.sleepDebtMin != null) {
    parts.push({ w: 0.15, score: clamp01(1 - today.sleepDebtMin / 600) });
  }

  if (parts.length === 0) return null;
  const totalW = parts.reduce((a, p) => a + p.w, 0);
  const score = parts.reduce((a, p) => a + p.score * (p.w / totalW), 0);
  return Math.round(score * 100);
}

export interface EnergyPoint {
  hour: number;  // 0–23 local
  level: number; // 0–1
}

/**
 * Circadian energy forecast (Rise-style "energy schedule"):
 * a two-peak curve anchored to wake time — morning rise to a late-morning
 * peak, post-lunch dip, second evening peak, then melatonin decline.
 * Sleep debt damps the whole curve and deepens the afternoon dip.
 */
export function energyCurve(wakeHour: number, sleepDebtMin: number): EnergyPoint[] {
  const debtFactor = 1 - clamp01(sleepDebtMin / 600) * 0.45; // ≥10h debt → 55% amplitude
  const points: EnergyPoint[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const t = (hour - wakeHour + 24) % 24; // hours since wake

    // two-peak base: peaks ~t=4 and ~t=11, trough ~t=7.5
    const wave =
      0.55 * Math.exp(-((t - 4) ** 2) / 8) +
      0.5 * Math.exp(-((t - 11) ** 2) / 10);

    // post-lunch dip, deepened by debt
    const dip = (0.12 + clamp01(sleepDebtMin / 600) * 0.15) * Math.exp(-((t - 7.5) ** 2) / 2.5);

    // asleep window (t ≥ 16 → winding down / asleep)
    const awakeFactor = t > 16 ? Math.max(0, 1 - (t - 16) / 3) : 1;

    const level = clamp01((0.18 + wave - dip) * debtFactor * awakeFactor);
    points.push({ hour, level: Math.round(level * 100) / 100 });
  }
  return points;
}
