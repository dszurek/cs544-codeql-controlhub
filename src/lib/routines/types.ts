/**
 * Routine type system — trigger → conditions → actions, all stored as
 * JSON on the Routine row. This module is the single source of truth for
 * those shapes and their validation. Pure (no I/O), so it's testable and
 * shared by the engine, the API, and the builder UI.
 */

// ── Triggers ──────────────────────────────────────────────────────────
export type Trigger =
  | { kind: 'time'; at: string; days?: number[] } // at "HH:MM"; days 0-6 (Sun-Sat), omit = every day
  | { kind: 'health_metric'; metric: HealthMetric; op: Op; value: number }
  | { kind: 'event_starting'; minutesBefore: number }
  | { kind: 'task_overdue' }
  | { kind: 'ha_state'; entityId: string; equals: string };

// ── Conditions (ANDed gates) ──────────────────────────────────────────
export type Condition =
  | { kind: 'time_between'; start: string; end: string } // "HH:MM"
  | { kind: 'day_of_week'; days: number[] }
  | { kind: 'health_metric'; metric: HealthMetric; op: Op; value: number };

// ── Actions ───────────────────────────────────────────────────────────
export type Action =
  | { kind: 'notify'; title: string; body?: string; glow?: Glow }
  | { kind: 'ha_scene'; entityId: string }
  | { kind: 'ha_service'; domain: string; service: string; entityId?: string }
  | { kind: 'create_task'; title: string; priority?: number; dueInHours?: number }
  | { kind: 'replan_day' }
  | { kind: 'ai_job'; jobType: string }
  | { kind: 'set_setting'; key: string; value: string };

export type HealthMetric = 'readiness' | 'sleepDebtMin' | 'hrvMs' | 'restingHr';
export type Op = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
export type Glow = 'track' | 'attend' | 'urgent';

export const TRIGGER_KINDS = ['time', 'health_metric', 'event_starting', 'task_overdue', 'ha_state'] as const;
export const ACTION_KINDS = ['notify', 'ha_scene', 'ha_service', 'create_task', 'replan_day', 'ai_job', 'set_setting'] as const;
export const CONDITION_KINDS = ['time_between', 'day_of_week', 'health_metric'] as const;

/**
 * Keys a routine's `set_setting` action is allowed to write. Deliberately only
 * benign, user-facing toggles — never tokens, secrets, or capability gates like
 * forge_enabled / ha_token / *_ingest_token, which a routine must not be able to
 * flip on its own.
 */
export const SET_SETTING_ALLOWED_KEYS = [
  'exam_mode',
  'cortex_auto',
  'flow_day_start',
  'flow_day_end',
] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isHHMM = (v: unknown): v is string => typeof v === 'string' && HHMM.test(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const OPS: Op[] = ['lt', 'lte', 'gt', 'gte', 'eq'];
const METRICS: HealthMetric[] = ['readiness', 'sleepDebtMin', 'hrvMs', 'restingHr'];
const isDays = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);

export function validateTrigger(raw: unknown): Trigger | null {
  const t = raw as Record<string, unknown> | null;
  switch (t?.kind) {
    case 'time':
      if (!isHHMM(t.at)) return null;
      return { kind: 'time', at: t.at, ...(isDays(t.days) ? { days: t.days } : {}) };
    case 'health_metric':
      if (!METRICS.includes(t.metric as HealthMetric) || !OPS.includes(t.op as Op) || !isNum(t.value)) return null;
      return { kind: 'health_metric', metric: t.metric as HealthMetric, op: t.op as Op, value: t.value };
    case 'event_starting':
      if (!isNum(t.minutesBefore) || t.minutesBefore < 0) return null;
      return { kind: 'event_starting', minutesBefore: t.minutesBefore };
    case 'task_overdue':
      return { kind: 'task_overdue' };
    case 'ha_state':
      if (!isStr(t.entityId) || !isStr(t.equals)) return null;
      return { kind: 'ha_state', entityId: t.entityId, equals: t.equals };
    default:
      return null;
  }
}

export function validateCondition(raw: unknown): Condition | null {
  const c = raw as Record<string, unknown> | null;
  switch (c?.kind) {
    case 'time_between':
      if (!isHHMM(c.start) || !isHHMM(c.end)) return null;
      return { kind: 'time_between', start: c.start, end: c.end };
    case 'day_of_week':
      if (!isDays(c.days) || c.days.length === 0) return null;
      return { kind: 'day_of_week', days: c.days };
    case 'health_metric':
      if (!METRICS.includes(c.metric as HealthMetric) || !OPS.includes(c.op as Op) || !isNum(c.value)) return null;
      return { kind: 'health_metric', metric: c.metric as HealthMetric, op: c.op as Op, value: c.value };
    default:
      return null;
  }
}

export function validateAction(raw: unknown): Action | null {
  const a = raw as Record<string, unknown> | null;
  switch (a?.kind) {
    case 'notify':
      if (!isStr(a.title)) return null;
      return {
        kind: 'notify',
        title: a.title,
        ...(isStr(a.body) ? { body: a.body } : {}),
        ...(a.glow === 'attend' || a.glow === 'urgent' || a.glow === 'track' ? { glow: a.glow } : {}),
      };
    case 'ha_scene':
      if (!isStr(a.entityId)) return null;
      return { kind: 'ha_scene', entityId: a.entityId };
    case 'ha_service':
      if (!isStr(a.domain) || !isStr(a.service)) return null;
      return {
        kind: 'ha_service',
        domain: a.domain,
        service: a.service,
        ...(isStr(a.entityId) ? { entityId: a.entityId } : {}),
      };
    case 'create_task':
      if (!isStr(a.title)) return null;
      return {
        kind: 'create_task',
        title: a.title,
        ...(isNum(a.priority) ? { priority: a.priority } : {}),
        ...(isNum(a.dueInHours) ? { dueInHours: a.dueInHours } : {}),
      };
    case 'replan_day':
      return { kind: 'replan_day' };
    case 'ai_job':
      if (!isStr(a.jobType)) return null;
      return { kind: 'ai_job', jobType: a.jobType };
    case 'set_setting':
      if (!isStr(a.key) || typeof a.value !== 'string') return null;
      if (!(SET_SETTING_ALLOWED_KEYS as readonly string[]).includes(a.key)) return null;
      return { kind: 'set_setting', key: a.key, value: a.value };
    default:
      return null;
  }
}

export interface ParsedRoutine {
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
}

/** Parse the JSON columns of a Routine row; returns null if the trigger or
 *  all actions are invalid (a routine with no valid action can't fire). */
export function parseRoutine(triggerJson: string, conditionsJson: string, actionsJson: string): ParsedRoutine | null {
  let trigger: Trigger | null;
  let conditions: Condition[];
  let actions: Action[];
  try {
    trigger = validateTrigger(JSON.parse(triggerJson));
    const condRaw = JSON.parse(conditionsJson || '[]');
    const actRaw = JSON.parse(actionsJson);
    conditions = Array.isArray(condRaw) ? condRaw.map(validateCondition).filter((c): c is Condition => c !== null) : [];
    actions = Array.isArray(actRaw) ? actRaw.map(validateAction).filter((a): a is Action => a !== null) : [];
  } catch {
    return null;
  }
  if (!trigger || actions.length === 0) return null;
  return { trigger, conditions, actions };
}

export function compare(actual: number, op: Op, value: number): boolean {
  switch (op) {
    case 'lt': return actual < value;
    case 'lte': return actual <= value;
    case 'gt': return actual > value;
    case 'gte': return actual >= value;
    case 'eq': return actual === value;
  }
}
