/**
 * Pure routine matching — given a snapshot of the world, decide whether a
 * trigger fires and produce a dedupe key so the same real-world event
 * never fires a routine twice. No I/O; fully unit-tested.
 */
import { compare, type Condition, type Trigger, type HealthMetric } from './types';

export interface RoutineContext {
  now: Date;
  /** Upcoming timed events today. */
  events: Array<{ id: string; startAt: Date; title: string }>;
  /** Currently-overdue pending tasks. */
  overdueTasks: Array<{ id: string; title: string }>;
  /** Latest daily health rollup, or null when no data. */
  health: Partial<Record<HealthMetric, number | null>> | null;
  /** Current HA entity states by entityId. */
  haStates: Map<string, string>;
}

export interface TriggerMatch {
  matched: boolean;
  /** When set, a RoutineRun with the same key suppresses a re-fire. */
  dedupeKey?: string;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function metricValue(health: RoutineContext['health'], metric: HealthMetric): number | null {
  if (!health) return null;
  const v = health[metric];
  return typeof v === 'number' ? v : null;
}

/** The scheduler ticks once a minute; a time trigger matches within that minute. */
export function evaluateTrigger(trigger: Trigger, ctx: RoutineContext): TriggerMatch {
  switch (trigger.kind) {
    case 'time': {
      if (trigger.days && !trigger.days.includes(ctx.now.getDay())) return { matched: false };
      const matched = minutesOfDay(ctx.now) === hhmmToMin(trigger.at);
      return matched ? { matched: true, dedupeKey: `time:${dayKey(ctx.now)}:${trigger.at}` } : { matched: false };
    }
    case 'health_metric': {
      const v = metricValue(ctx.health, trigger.metric);
      if (v === null) return { matched: false };
      // Once-per-day: the daily rollup only changes day to day.
      return compare(v, trigger.op, trigger.value)
        ? { matched: true, dedupeKey: `health:${dayKey(ctx.now)}:${trigger.metric}` }
        : { matched: false };
    }
    case 'event_starting': {
      const windowEnd = ctx.now.getTime() + trigger.minutesBefore * 60_000;
      const soon = ctx.events
        .filter((e) => e.startAt.getTime() > ctx.now.getTime() && e.startAt.getTime() <= windowEnd)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
      return soon ? { matched: true, dedupeKey: `event:${soon.id}` } : { matched: false };
    }
    case 'task_overdue': {
      const task = ctx.overdueTasks[0];
      return task ? { matched: true, dedupeKey: `task:${task.id}` } : { matched: false };
    }
    case 'ha_state': {
      const state = ctx.haStates.get(trigger.entityId);
      if (state === undefined || state !== trigger.equals) return { matched: false };
      // Dedupe per day: a sustained/repeated state fires at most once a day, and
      // re-arms the next day. (A value-only key never expired, so the routine
      // fired exactly once for the lifetime of the DB.) True edge-triggering —
      // fire on every transition into the state — would need previous-state
      // tracking across ticks, which the engine deliberately doesn't keep.
      return { matched: true, dedupeKey: `ha:${dayKey(ctx.now)}:${trigger.entityId}:${state}` };
    }
  }
}

export function evaluateConditions(conditions: Condition[], ctx: RoutineContext): boolean {
  return conditions.every((c) => evaluateCondition(c, ctx));
}

function evaluateCondition(c: Condition, ctx: RoutineContext): boolean {
  switch (c.kind) {
    case 'time_between': {
      const now = minutesOfDay(ctx.now);
      const start = hhmmToMin(c.start);
      const end = hhmmToMin(c.end);
      // Supports windows that wrap past midnight (e.g. 22:00–06:00).
      return start <= end ? now >= start && now <= end : now >= start || now <= end;
    }
    case 'day_of_week':
      return c.days.includes(ctx.now.getDay());
    case 'health_metric': {
      const v = metricValue(ctx.health, c.metric);
      return v !== null && compare(v, c.op, c.value);
    }
  }
}

/** Which context slices a set of routines actually needs — lets the engine
 *  skip expensive fetches (HA states, events) when nothing references them. */
export function neededContext(triggers: Trigger[], conditions: Condition[][]): {
  events: boolean;
  overdueTasks: boolean;
  health: boolean;
  haStates: boolean;
} {
  const flatConds = conditions.flat();
  return {
    events: triggers.some((t) => t.kind === 'event_starting'),
    overdueTasks: triggers.some((t) => t.kind === 'task_overdue'),
    health:
      triggers.some((t) => t.kind === 'health_metric') ||
      flatConds.some((c) => c.kind === 'health_metric'),
    haStates: triggers.some((t) => t.kind === 'ha_state'),
  };
}
