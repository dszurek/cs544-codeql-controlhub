import { describe, it, expect } from 'vitest';
import {
  computeBaselines,
  computeSleepDebt,
  computeReadiness,
  energyCurve,
} from '@/lib/health/metrics';

const day = (i: number) => new Date(2026, 5, i + 1);

describe('computeBaselines', () => {
  it('averages available metrics', () => {
    const base = computeBaselines([
      { date: day(0), hrvMs: 40, restingHr: 60, sleepMinutes: 460 },
      { date: day(1), hrvMs: 50, restingHr: 56, sleepMinutes: 480 },
      { date: day(2), hrvMs: 45, restingHr: 58, sleepMinutes: 470 },
      { date: day(3), hrvMs: 55, restingHr: 54, sleepMinutes: 490 },
      { date: day(4), hrvMs: 60, restingHr: 52, sleepMinutes: 500 },
    ]);
    expect(base.hrvMs).toBe(50);
    expect(base.restingHr).toBe(56);
    expect(base.sleepNeedMin).toBe(480);
  });

  it('defaults sleep need to 8h with sparse data', () => {
    const base = computeBaselines([{ date: day(0), sleepMinutes: 300 }]);
    expect(base.sleepNeedMin).toBe(480);
  });

  it('clamps sleep need to a sane band', () => {
    const longSleepers = Array.from({ length: 10 }, (_, i) => ({ date: day(i), sleepMinutes: 660 }));
    expect(computeBaselines(longSleepers).sleepNeedMin).toBe(570);
  });

  it('handles empty input', () => {
    const base = computeBaselines([]);
    expect(base.hrvMs).toBeNull();
    expect(base.sleepNeedMin).toBe(480);
  });
});

describe('computeSleepDebt', () => {
  it('accumulates deficits', () => {
    expect(computeSleepDebt([420, 420], 480)).toBe(120);
  });

  it('lets surpluses repay debt but never goes negative', () => {
    expect(computeSleepDebt([420, 540], 480)).toBe(0);
    expect(computeSleepDebt([540, 540], 480)).toBe(0);
  });

  it('ignores missing nights', () => {
    expect(computeSleepDebt([null, 420, null], 480)).toBe(60);
  });
});

describe('computeReadiness', () => {
  const base = { hrvMs: 50, restingHr: 56, sleepNeedMin: 480, dataDays: 30 };

  it('is ~mid-range when everything matches baseline', () => {
    const r = computeReadiness(
      { hrvMs: 50, restingHr: 56, sleepMinutes: 480, sleepDebtMin: 0 },
      base,
    );
    // components: HRV/RHR at baseline = 0.5 each, full sleep + zero debt = 1.0
    // → 0.35·0.5 + 0.2·0.5 + 0.3·1 + 0.15·1 = 0.725
    expect(r).toBe(73);
  });

  it('drops with tanked HRV, raised RHR, short sleep, and debt', () => {
    const bad = computeReadiness(
      { hrvMs: 28, restingHr: 66, sleepMinutes: 300, sleepDebtMin: 400 },
      base,
    )!;
    const good = computeReadiness(
      { hrvMs: 65, restingHr: 50, sleepMinutes: 500, sleepDebtMin: 0 },
      base,
    )!;
    expect(bad).toBeLessThan(45);
    expect(good).toBeGreaterThan(85);
  });

  it('returns null with no usable inputs', () => {
    expect(computeReadiness({}, base)).toBeNull();
    expect(computeReadiness({ hrvMs: 50 }, { ...base, hrvMs: null })).toBeNull();
  });

  it('stays in 0-100', () => {
    const r = computeReadiness(
      { hrvMs: 200, restingHr: 30, sleepMinutes: 700, sleepDebtMin: 0 },
      base,
    )!;
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe('energyCurve', () => {
  it('returns 24 hourly points in 0..1', () => {
    const curve = energyCurve(7, 0);
    expect(curve).toHaveLength(24);
    for (const p of curve) {
      expect(p.level).toBeGreaterThanOrEqual(0);
      expect(p.level).toBeLessThanOrEqual(1);
    }
  });

  it('peaks after wake, not before', () => {
    const curve = energyCurve(7, 0);
    const at = (h: number) => curve.find((p) => p.hour === h)!.level;
    expect(at(11)).toBeGreaterThan(at(5)); // late-morning peak > pre-wake
    expect(at(11)).toBeGreaterThan(at(15)); // and > afternoon dip
  });

  it('damps the whole curve under heavy sleep debt', () => {
    const rested = energyCurve(7, 0);
    const indebted = energyCurve(7, 600);
    const max = (c: typeof rested) => Math.max(...c.map((p) => p.level));
    expect(max(indebted)).toBeLessThan(max(rested));
  });
});
