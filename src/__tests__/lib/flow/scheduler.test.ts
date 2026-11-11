import { describe, it, expect } from 'vitest';
import {
  mergeBusy,
  computeGaps,
  scoreTask,
  isDeepWork,
  avgEnergy,
  planDay,
  type FlowTask,
  type PlanInput,
} from '@/lib/flow/scheduler';

const at = (h: number, m = 0) => new Date(2026, 5, 15, h, m); // Mon Jun 15 2026, local

function task(overrides: Partial<FlowTask>): FlowTask {
  return { id: Math.random().toString(36).slice(2), title: 't', priority: 3, type: 'general', ...overrides };
}

function input(overrides: Partial<PlanInput>): PlanInput {
  return {
    tasks: [],
    busy: [],
    energy: [],
    windowStart: at(8),
    windowEnd: at(22),
    now: at(7, 30),
    ...overrides,
  };
}

describe('mergeBusy / computeGaps', () => {
  it('merges overlaps and clips to the window', () => {
    const merged = mergeBusy(
      [
        { start: at(9), end: at(10, 30) },
        { start: at(10), end: at(11) },
        { start: at(6), end: at(8, 30) }, // starts before window
      ],
      at(8),
      at(22),
    );
    expect(merged).toEqual([
      { start: at(8), end: at(8, 30) },
      { start: at(9), end: at(11) },
    ]);
  });

  it('returns the gaps between busy intervals', () => {
    const gaps = computeGaps([{ start: at(9), end: at(11) }], at(8), at(13));
    expect(gaps).toEqual([
      { start: at(8), end: at(9) },
      { start: at(11), end: at(13) },
    ]);
  });

  it('drops gaps shorter than the minimum block', () => {
    const gaps = computeGaps(
      [{ start: at(8, 10), end: at(12) }], // only 10 min before it
      at(8),
      at(13),
    );
    expect(gaps).toEqual([{ start: at(12), end: at(13) }]);
  });
});

describe('scoreTask', () => {
  it('ranks due-today P1 above undated P4', () => {
    const urgent = scoreTask(task({ priority: 1, dueDate: at(18) }), at(8), false);
    const chill = scoreTask(task({ priority: 4 }), at(8), false);
    expect(urgent).toBeGreaterThan(chill);
  });

  it('boosts academic types in exam mode only', () => {
    const hw = task({ type: 'homework' });
    expect(scoreTask(hw, at(8), true)).toBe(scoreTask(hw, at(8), false) + 6);
    const errand = task({ type: 'shopping' });
    expect(scoreTask(errand, at(8), true)).toBe(scoreTask(errand, at(8), false));
  });
});

describe('isDeepWork', () => {
  it('treats long estimates and academic types as deep', () => {
    expect(isDeepWork(task({ estimatedMinutes: 90 }))).toBe(true);
    expect(isDeepWork(task({ type: 'exam', estimatedMinutes: 20 }))).toBe(true);
    expect(isDeepWork(task({ type: 'shopping', estimatedMinutes: 15 }))).toBe(false);
  });
});

describe('avgEnergy', () => {
  it('weights curve levels by minute-overlap and defaults to 0.5', () => {
    const energy = [
      { hour: 9, level: 0.8 },
      { hour: 10, level: 0.6 },
    ];
    // 09:00–10:30 = 60 min in hour 9 + 30 min in hour 10 = (0.8*60 + 0.6*30)/90
    expect(avgEnergy(energy, at(9), at(10, 30))).toBeCloseTo(0.7333);
    // A block wholly inside one hour takes that hour's level, not a blend with
    // the next hour (the old whole-hour loop returned 0.7 here).
    expect(avgEnergy(energy, at(9), at(10))).toBeCloseTo(0.8);
    expect(avgEnergy([], at(9), at(10))).toBe(0.5);
  });
});

describe('planDay', () => {
  it('never overlaps events or other blocks', () => {
    const blocks = planDay(
      input({
        tasks: [
          task({ id: 'a', estimatedMinutes: 60, priority: 1 }),
          task({ id: 'b', estimatedMinutes: 60, priority: 2 }),
        ],
        busy: [{ start: at(9), end: at(12) }, { start: at(14), end: at(16) }],
      }),
    );
    expect(blocks.length).toBe(2);
    const all = [
      ...blocks.map((b) => ({ start: b.start, end: b.end })),
      { start: at(9), end: at(12) },
      { start: at(14), end: at(16) },
    ].sort((x, y) => x.start.getTime() - y.start.getTime());
    for (let i = 1; i < all.length; i++) {
      expect(all[i].start.getTime()).toBeGreaterThanOrEqual(all[i - 1].end.getTime());
    }
  });

  it('never schedules before now', () => {
    const blocks = planDay(
      input({ tasks: [task({ id: 'a' })], now: at(13, 15) }),
    );
    expect(blocks[0].start.getTime()).toBeGreaterThanOrEqual(at(13, 15).getTime());
  });

  it('excludes blocked tasks', () => {
    const blocks = planDay(input({ tasks: [task({ id: 'a', blocked: true })] }));
    expect(blocks).toHaveLength(0);
  });

  it('finishes a due-today task before its due time when possible', () => {
    const blocks = planDay(
      input({
        tasks: [task({ id: 'a', dueDate: at(15), dueTime: '15:00', estimatedMinutes: 60 })],
        busy: [{ start: at(8), end: at(10) }],
      }),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].end.getTime()).toBeLessThanOrEqual(at(15).getTime());
  });

  it('puts deep work in the energy peak and shallow work in the trough', () => {
    // Peak 9-11, trough 14-16
    const energy = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      level: hour >= 9 && hour < 11 ? 0.9 : hour >= 14 && hour < 16 ? 0.15 : 0.5,
    }));
    const blocks = planDay(
      input({
        tasks: [
          task({ id: 'deep', type: 'project', estimatedMinutes: 90 }),
          task({ id: 'shallow', type: 'shopping', estimatedMinutes: 30 }),
        ],
        energy,
      }),
    );
    const deep = blocks.find((b) => b.taskId === 'deep')!;
    const shallow = blocks.find((b) => b.taskId === 'shallow')!;
    expect(deep.start.getHours()).toBeGreaterThanOrEqual(8);
    expect(deep.start.getHours()).toBeLessThanOrEqual(10);
    expect(shallow.start.getHours()).toBeGreaterThanOrEqual(14);
    expect(shallow.start.getHours()).toBeLessThanOrEqual(15);
  });

  it('truncates to the largest gap rather than dropping a task', () => {
    const blocks = planDay(
      input({
        tasks: [task({ id: 'a', estimatedMinutes: 180 })],
        busy: [{ start: at(9), end: at(21) }], // only 8-9 free
      }),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].truncated).toBe(true);
    expect((blocks[0].end.getTime() - blocks[0].start.getTime()) / 60000).toBe(60);
  });

  it('returns empty when the window has passed', () => {
    const blocks = planDay(input({ tasks: [task({})], now: at(23) }));
    expect(blocks).toHaveLength(0);
  });
});
