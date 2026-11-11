import { describe, it, expect } from 'vitest';
import { assignLanes, computeRange, minutesIntoDay } from '@/components/today/timelineLayout';

describe('computeRange', () => {
  it('defaults to 07–22 with nothing scheduled', () => {
    expect(computeRange([])).toEqual({ startHour: 7, endHour: 22 });
  });

  it('stretches to fit early and late items', () => {
    const r = computeRange([{ startMin: 5 * 60 + 30, endMin: 23 * 60 + 15 }]);
    expect(r.startHour).toBe(5);
    expect(r.endHour).toBe(24);
  });

  it('never exceeds the day', () => {
    const r = computeRange([{ startMin: -30, endMin: 25 * 60 }]);
    expect(r.startHour).toBe(0);
    expect(r.endHour).toBe(24);
  });
});

describe('assignLanes', () => {
  it('gives non-overlapping items a single full-width lane', () => {
    const lanes = assignLanes([
      { startMin: 60, endMin: 120 },
      { startMin: 120, endMin: 180 },
    ]);
    expect(lanes).toEqual([
      { lane: 0, lanes: 1 },
      { lane: 0, lanes: 1 },
    ]);
  });

  it('splits overlapping items into side-by-side lanes', () => {
    const lanes = assignLanes([
      { startMin: 60, endMin: 180 },
      { startMin: 90, endMin: 150 },
    ]);
    expect(lanes[0]).toEqual({ lane: 0, lanes: 2 });
    expect(lanes[1]).toEqual({ lane: 1, lanes: 2 });
  });

  it('reuses freed lanes within a cluster', () => {
    const lanes = assignLanes([
      { startMin: 60, endMin: 100 },   // lane 0
      { startMin: 70, endMin: 200 },   // lane 1 (overlaps first)
      { startMin: 110, endMin: 160 },  // lane 0 again (first ended)
    ]);
    expect(lanes[0].lane).toBe(0);
    expect(lanes[1].lane).toBe(1);
    expect(lanes[2].lane).toBe(0);
    expect(lanes.every((l) => l.lanes === 2)).toBe(true);
  });

  it('keeps separate clusters at independent widths', () => {
    const lanes = assignLanes([
      { startMin: 60, endMin: 120 },
      { startMin: 80, endMin: 140 },   // overlaps → cluster of 2
      { startMin: 300, endMin: 360 },  // isolated → full width
    ]);
    expect(lanes[2]).toEqual({ lane: 0, lanes: 1 });
  });
});

describe('minutesIntoDay', () => {
  it('converts local time to minutes', () => {
    expect(minutesIntoDay(new Date('2026-06-12T08:30:00'))).toBe(510);
  });
});
