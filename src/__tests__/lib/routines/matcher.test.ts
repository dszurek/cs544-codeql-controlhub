import { describe, it, expect } from 'vitest';
import { evaluateTrigger, evaluateConditions, neededContext, type RoutineContext } from '@/lib/routines/matcher';
import type { Trigger, Condition } from '@/lib/routines/types';

// Mon 2026-06-15, 21:30 local
const NOW = new Date(2026, 5, 15, 21, 30, 0);

function ctx(overrides: Partial<RoutineContext> = {}): RoutineContext {
  return {
    now: NOW,
    events: [],
    overdueTasks: [],
    health: null,
    haStates: new Map(),
    ...overrides,
  };
}

describe('evaluateTrigger — time', () => {
  it('matches at the exact minute with a day-keyed dedupe', () => {
    const r = evaluateTrigger({ kind: 'time', at: '21:30' }, ctx());
    expect(r.matched).toBe(true);
    expect(r.dedupeKey).toBe('time:2026-6-15:21:30');
  });

  it('does not match a different minute', () => {
    expect(evaluateTrigger({ kind: 'time', at: '21:31' }, ctx()).matched).toBe(false);
  });

  it('respects the days filter (Mon = 1)', () => {
    expect(evaluateTrigger({ kind: 'time', at: '21:30', days: [1] }, ctx()).matched).toBe(true);
    expect(evaluateTrigger({ kind: 'time', at: '21:30', days: [0, 6] }, ctx()).matched).toBe(false);
  });
});

describe('evaluateTrigger — health_metric', () => {
  it('matches when the metric satisfies the comparison', () => {
    const r = evaluateTrigger(
      { kind: 'health_metric', metric: 'sleepDebtMin', op: 'gt', value: 120 },
      ctx({ health: { sleepDebtMin: 200 } }),
    );
    expect(r.matched).toBe(true);
    expect(r.dedupeKey).toBe('health:2026-6-15:sleepDebtMin');
  });

  it('does not match without data', () => {
    expect(
      evaluateTrigger({ kind: 'health_metric', metric: 'readiness', op: 'lt', value: 40 }, ctx()).matched,
    ).toBe(false);
  });
});

describe('evaluateTrigger — event_starting', () => {
  it('matches the soonest event within the window and dedupes per event', () => {
    const r = evaluateTrigger(
      { kind: 'event_starting', minutesBefore: 15 },
      ctx({
        events: [
          { id: 'far', startAt: new Date(2026, 5, 15, 23, 0), title: 'Late' },
          { id: 'soon', startAt: new Date(2026, 5, 15, 21, 40), title: 'Standup' },
        ],
      }),
    );
    expect(r.matched).toBe(true);
    expect(r.dedupeKey).toBe('event:soon');
  });

  it('ignores events already started or beyond the window', () => {
    const r = evaluateTrigger(
      { kind: 'event_starting', minutesBefore: 15 },
      ctx({
        events: [
          { id: 'past', startAt: new Date(2026, 5, 15, 21, 20), title: 'Past' },
          { id: 'late', startAt: new Date(2026, 5, 15, 22, 30), title: 'Later' },
        ],
      }),
    );
    expect(r.matched).toBe(false);
  });
});

describe('evaluateTrigger — task_overdue & ha_state', () => {
  it('matches the first overdue task', () => {
    const r = evaluateTrigger({ kind: 'task_overdue' }, ctx({ overdueTasks: [{ id: 't1', title: 'Late' }] }));
    expect(r).toEqual({ matched: true, dedupeKey: 'task:t1' });
  });

  it('matches an HA state and dedupes on the value', () => {
    const r = evaluateTrigger(
      { kind: 'ha_state', entityId: 'binary_sensor.door', equals: 'on' },
      ctx({ haStates: new Map([['binary_sensor.door', 'on']]) }),
    );
    expect(r).toEqual({ matched: true, dedupeKey: 'ha:2026-6-15:binary_sensor.door:on' });
  });

  it('does not match a different HA state', () => {
    const r = evaluateTrigger(
      { kind: 'ha_state', entityId: 'binary_sensor.door', equals: 'on' },
      ctx({ haStates: new Map([['binary_sensor.door', 'off']]) }),
    );
    expect(r.matched).toBe(false);
  });
});

describe('evaluateConditions', () => {
  it('ANDs all conditions', () => {
    const conds: Condition[] = [
      { kind: 'day_of_week', days: [1] },
      { kind: 'time_between', start: '21:00', end: '23:00' },
    ];
    expect(evaluateConditions(conds, ctx())).toBe(true);
    expect(evaluateConditions([{ kind: 'day_of_week', days: [0] }], ctx())).toBe(false);
  });

  it('handles windows that wrap past midnight', () => {
    const overnight: Condition[] = [{ kind: 'time_between', start: '22:00', end: '06:00' }];
    expect(evaluateConditions(overnight, ctx({ now: new Date(2026, 5, 15, 23, 0) }))).toBe(true);
    expect(evaluateConditions(overnight, ctx({ now: new Date(2026, 5, 15, 5, 0) }))).toBe(true);
    expect(evaluateConditions(overnight, ctx({ now: new Date(2026, 5, 15, 12, 0) }))).toBe(false);
  });

  it('gates on a health metric', () => {
    const c: Condition[] = [{ kind: 'health_metric', metric: 'readiness', op: 'gte', value: 70 }];
    expect(evaluateConditions(c, ctx({ health: { readiness: 80 } }))).toBe(true);
    expect(evaluateConditions(c, ctx({ health: { readiness: 50 } }))).toBe(false);
    expect(evaluateConditions(c, ctx())).toBe(false); // no data → fails closed
  });
});

describe('neededContext', () => {
  it('flags only the slices the routines reference', () => {
    const triggers: Trigger[] = [{ kind: 'event_starting', minutesBefore: 10 }];
    const conditions: Condition[][] = [[{ kind: 'health_metric', metric: 'readiness', op: 'lt', value: 40 }]];
    expect(neededContext(triggers, conditions)).toEqual({
      events: true,
      overdueTasks: false,
      health: true,
      haStates: false,
    });
  });

  it('needs nothing extra for pure time routines', () => {
    expect(neededContext([{ kind: 'time', at: '08:00' }], [[]])).toEqual({
      events: false,
      overdueTasks: false,
      health: false,
      haStates: false,
    });
  });
});
