import { describe, it, expect } from 'vitest';
import {
  validateTrigger,
  validateAction,
  validateCondition,
  parseRoutine,
  compare,
} from '@/lib/routines/types';

describe('validateTrigger', () => {
  it('accepts valid triggers', () => {
    expect(validateTrigger({ kind: 'time', at: '08:30' })).toEqual({ kind: 'time', at: '08:30' });
    expect(validateTrigger({ kind: 'task_overdue' })).toEqual({ kind: 'task_overdue' });
    expect(validateTrigger({ kind: 'ha_state', entityId: 'light.x', equals: 'on' })).toEqual({
      kind: 'ha_state',
      entityId: 'light.x',
      equals: 'on',
    });
  });

  it('rejects malformed triggers', () => {
    expect(validateTrigger({ kind: 'time', at: '25:00' })).toBeNull();
    expect(validateTrigger({ kind: 'time', at: 'noon' })).toBeNull();
    expect(validateTrigger({ kind: 'health_metric', metric: 'bogus', op: 'lt', value: 1 })).toBeNull();
    expect(validateTrigger({ kind: 'event_starting', minutesBefore: -5 })).toBeNull();
    expect(validateTrigger({ kind: 'nope' })).toBeNull();
    expect(validateTrigger(null)).toBeNull();
  });

  it('keeps a valid days filter and drops an invalid one', () => {
    expect(validateTrigger({ kind: 'time', at: '08:00', days: [1, 2, 5] })).toEqual({
      kind: 'time',
      at: '08:00',
      days: [1, 2, 5],
    });
    expect(validateTrigger({ kind: 'time', at: '08:00', days: [9] })).toEqual({ kind: 'time', at: '08:00' });
  });
});

describe('validateAction', () => {
  it('accepts valid actions', () => {
    expect(validateAction({ kind: 'notify', title: 'Hi', body: 'there' })).toEqual({
      kind: 'notify',
      title: 'Hi',
      body: 'there',
    });
    expect(validateAction({ kind: 'replan_day' })).toEqual({ kind: 'replan_day' });
  });

  it('rejects actions missing required fields', () => {
    expect(validateAction({ kind: 'notify' })).toBeNull();
    expect(validateAction({ kind: 'ha_service', domain: 'light' })).toBeNull();
    expect(validateAction({ kind: 'set_setting', key: 'x' })).toBeNull();
  });

  it('restricts set_setting to the allowlist (no privilege escalation)', () => {
    // Allowed, benign toggle.
    expect(validateAction({ kind: 'set_setting', key: 'exam_mode', value: 'on' })).toEqual({
      kind: 'set_setting',
      key: 'exam_mode',
      value: 'on',
    });
    // Security-relevant keys must be rejected so a routine can't flip them.
    for (const key of ['forge_enabled', 'ha_token', 'health_ingest_token', 'vapid_private_key']) {
      expect(validateAction({ kind: 'set_setting', key, value: 'on' })).toBeNull();
    }
  });
});

describe('validateCondition', () => {
  it('validates time windows and day lists', () => {
    expect(validateCondition({ kind: 'time_between', start: '09:00', end: '17:00' })).toBeTruthy();
    expect(validateCondition({ kind: 'day_of_week', days: [] })).toBeNull();
    expect(validateCondition({ kind: 'time_between', start: '9am', end: '5pm' })).toBeNull();
  });
});

describe('parseRoutine', () => {
  it('parses a valid routine and drops invalid actions', () => {
    const parsed = parseRoutine(
      JSON.stringify({ kind: 'time', at: '08:00' }),
      JSON.stringify([{ kind: 'day_of_week', days: [1] }]),
      JSON.stringify([{ kind: 'replan_day' }, { kind: 'notify' /* invalid */ }]),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.actions).toEqual([{ kind: 'replan_day' }]);
    expect(parsed!.conditions).toHaveLength(1);
  });

  it('returns null when the trigger is invalid or no actions survive', () => {
    expect(parseRoutine('{"kind":"bad"}', '[]', '[{"kind":"replan_day"}]')).toBeNull();
    expect(parseRoutine('{"kind":"task_overdue"}', '[]', '[{"kind":"notify"}]')).toBeNull();
    expect(parseRoutine('not json', '[]', '[]')).toBeNull();
  });
});

describe('compare', () => {
  it('implements each operator', () => {
    expect(compare(3, 'lt', 5)).toBe(true);
    expect(compare(5, 'lte', 5)).toBe(true);
    expect(compare(6, 'gt', 5)).toBe(true);
    expect(compare(5, 'gte', 5)).toBe(true);
    expect(compare(5, 'eq', 5)).toBe(true);
    expect(compare(5, 'eq', 6)).toBe(false);
  });
});
