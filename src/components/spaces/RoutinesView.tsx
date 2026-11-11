'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { enablePush, isPushEnabled, pushSupported } from '@/lib/pushClient';
import { STARTER_ROUTINES } from './routineStarters';
import type { Trigger, Action, HealthMetric, Op } from '@/lib/routines/types';

interface RoutineRow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  conditions: string;
  actions: string;
  cooldownMinutes: number;
  lastFiredAt: string | null;
  runs: Array<{ firedAt: string; ok: boolean; detail: string | null }>;
}

const TRIGGER_LABEL: Record<Trigger['kind'], string> = {
  time: 'At a time',
  health_metric: 'Health metric crosses',
  event_starting: 'Before a calendar event',
  task_overdue: 'A task is overdue',
  ha_state: 'Home Assistant state',
};

const ACTION_LABEL: Record<Action['kind'], string> = {
  notify: 'Notify me',
  ha_scene: 'Activate HA scene',
  ha_service: 'Call HA service',
  create_task: 'Create a task',
  replan_day: 'Replan my day',
  ai_job: 'Run an AI job',
  set_setting: 'Change a setting',
};

function summarize(trigger: Trigger): string {
  switch (trigger.kind) {
    case 'time': return `At ${trigger.at}${trigger.days ? ` (days ${trigger.days.join(',')})` : ' daily'}`;
    case 'health_metric': return `When ${trigger.metric} ${trigger.op} ${trigger.value}`;
    case 'event_starting': return `${trigger.minutesBefore}m before an event`;
    case 'task_overdue': return 'When a task is overdue';
    case 'ha_state': return `When ${trigger.entityId} is "${trigger.equals}"`;
  }
}

function actionSummary(a: Action): string {
  switch (a.kind) {
    case 'notify': return `Notify: ${a.title}`;
    case 'ha_scene': return `Scene ${a.entityId}`;
    case 'ha_service': return `${a.domain}.${a.service}`;
    case 'create_task': return `Task: ${a.title}`;
    case 'replan_day': return 'Replan day';
    case 'ai_job': return `AI job: ${a.jobType}`;
    case 'set_setting': return `Set ${a.key}=${a.value}`;
  }
}

export function RoutinesView() {
  const toast = useToast();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(false);
  const [building, setBuilding] = useState(false);

  const load = useCallback(() => {
    fetch('/api/routines')
      .then((r) => (r.ok ? r.json() : { routines: [] }))
      .then((d) => setRoutines(d.routines ?? []))
      .catch(() => toast.error('Failed to load routines'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
    void isPushEnabled().then(setPushOn);
  }, [load]);

  async function toggle(r: RoutineRow) {
    setRoutines((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: !r.enabled } : x)));
    await fetch(`/api/routines/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !r.enabled }),
    }).catch(() => toast.error('Failed to update'));
  }

  async function remove(r: RoutineRow) {
    setRoutines((prev) => prev.filter((x) => x.id !== r.id));
    await fetch(`/api/routines/${r.id}`, { method: 'DELETE' }).catch(() => toast.error('Failed to delete'));
  }

  async function runNow(r: RoutineRow) {
    const res = await fetch(`/api/routines/${r.id}/run`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast.success(`Ran: ${data.message ?? 'done'}`);
    else toast.error('Run failed');
    load();
  }

  async function seed(starter: (typeof STARTER_ROUTINES)[number]) {
    const res = await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(starter),
    });
    if (res.ok) {
      toast.success(`Added "${starter.name}"`);
      load();
    } else {
      toast.error('Failed to add routine');
    }
  }

  async function turnOnPush() {
    const res = await enablePush();
    if (res.ok) {
      setPushOn(true);
      toast.success('Notifications enabled');
    } else {
      toast.error(res.error ?? 'Could not enable push');
    }
  }

  const existingNames = new Set(routines.map((r) => r.name));

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
      {/* Push enrollment */}
      <section className="glass-pane reveal" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <div>
            <h2 className="section-label" style={{ marginBottom: 4 }}>Notifications</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {pushOn
                ? 'This device receives routine push notifications.'
                : 'Enable push so routines can reach you when ControlHub is closed.'}
            </p>
          </div>
          {!pushOn && (
            <button className="btn-glow" onClick={() => void turnOnPush()} disabled={!pushSupported()}>
              {pushSupported() ? 'Enable notifications' : 'Not supported here'}
            </button>
          )}
          {pushOn && <span className="surface-stat glow-track glow-text">● enabled</span>}
        </div>
      </section>

      {/* Active routines */}
      <section className="reveal" style={{ ['--reveal-i' as string]: 1 }}>
        <div className="surface-head" style={{ marginBottom: 'var(--sp-3)' }}>
          <h2 className="surface-title" style={{ fontSize: '1.25rem' }}>Routines</h2>
          <button className="pill" onClick={() => setBuilding((b) => !b)}>
            {building ? 'close' : '+ new routine'}
          </button>
        </div>

        {building && <RoutineBuilder onCreated={() => { setBuilding(false); load(); }} />}

        {loading ? (
          <span className="skeleton" style={{ height: 64, marginTop: 12 }} />
        ) : routines.length === 0 ? (
          <p className="hz-empty">No routines yet. Add a starter below, or build one.</p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            {routines.map((r, i) => {
              let trigger: Trigger | null = null;
              let actions: Action[] = [];
              try {
                trigger = JSON.parse(r.trigger);
                actions = JSON.parse(r.actions);
              } catch { /* corrupt row — show name only */ }
              const last = r.runs[0];
              return (
                <div
                  key={r.id}
                  className={`routine-card glass-card reveal${r.enabled ? '' : ' disabled'}`}
                  style={{ ['--reveal-i' as string]: i }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="routine-name">{r.name}</div>
                    <div className="routine-flow">
                      {trigger && <span className="routine-trig">{summarize(trigger)}</span>}
                      <span className="routine-arrow">→</span>
                      <span>{actions.map(actionSummary).join(', ')}</span>
                    </div>
                    {last && (
                      <div className="routine-last">
                        last: {new Date(last.firedAt).toLocaleString()} {last.ok ? '✓' : '✕'}
                      </div>
                    )}
                  </div>
                  <div className="routine-actions">
                    <button className="pill" onClick={() => void runNow(r)} title="Run actions now">test</button>
                    <button
                      className={`pill${r.enabled ? ' active' : ''}`}
                      onClick={() => void toggle(r)}
                    >
                      {r.enabled ? 'on' : 'off'}
                    </button>
                    <button className="pill" onClick={() => void remove(r)} title="Delete">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Starters */}
      <section className="reveal" style={{ ['--reveal-i' as string]: 2 }}>
        <h2 className="section-label">Starter routines</h2>
        <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
          {STARTER_ROUTINES.map((s) => (
            <div key={s.name} className="glass-card" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="routine-name">{s.name}</div>
                <div className="routine-last">{s.description}</div>
              </div>
              <button
                className="pill"
                disabled={existingNames.has(s.name)}
                onClick={() => void seed(s)}
              >
                {existingNames.has(s.name) ? 'added' : '+ add'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Minimal builder: trigger + one action covers the common case;
//    starters cover the richer cross-domain combos. ──
function RoutineBuilder({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [triggerKind, setTriggerKind] = useState<Trigger['kind']>('time');
  const [at, setAt] = useState('08:00');
  const [metric, setMetric] = useState('readiness');
  const [op, setOp] = useState('lt');
  const [value, setValue] = useState('40');
  const [minutesBefore, setMinutesBefore] = useState('15');
  const [entityId, setEntityId] = useState('');
  const [equals, setEquals] = useState('');

  const [actionKind, setActionKind] = useState<Action['kind']>('notify');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [sceneEntity, setSceneEntity] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [aiJobType, setAiJobType] = useState('plan_day');

  function buildTrigger(): Trigger | null {
    switch (triggerKind) {
      case 'time': return { kind: 'time', at };
      case 'health_metric': return { kind: 'health_metric', metric: metric as HealthMetric, op: op as Op, value: Number(value) };
      case 'event_starting': return { kind: 'event_starting', minutesBefore: Number(minutesBefore) };
      case 'task_overdue': return { kind: 'task_overdue' };
      case 'ha_state': return entityId && equals ? { kind: 'ha_state', entityId, equals } : null;
    }
  }

  function buildAction(): Action | null {
    switch (actionKind) {
      case 'notify': return notifyTitle ? { kind: 'notify', title: notifyTitle, body: notifyBody || undefined } : null;
      case 'ha_scene': return sceneEntity ? { kind: 'ha_scene', entityId: sceneEntity } : null;
      case 'create_task': return taskTitle ? { kind: 'create_task', title: taskTitle } : null;
      case 'replan_day': return { kind: 'replan_day' };
      case 'ai_job': return { kind: 'ai_job', jobType: aiJobType };
      default: return null;
    }
  }

  async function save() {
    const trigger = buildTrigger();
    const action = buildAction();
    if (!name.trim()) return toast.error('Name required');
    if (!trigger) return toast.error('Complete the trigger fields');
    if (!action) return toast.error('Complete the action fields');

    const res = await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), trigger, conditions: [], actions: [action] }),
    });
    if (res.ok) {
      toast.success('Routine created');
      onCreated();
    } else {
      toast.error('Failed to create routine');
    }
  }

  const field: React.CSSProperties = {
    background: 'rgba(42, 47, 53, 0.5)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--beige-light)',
    padding: '0.4rem 0.6rem',
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-inter)',
  };

  return (
    <div className="glass-pane" style={{ padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
      <input style={field} placeholder="Routine name" value={name} onChange={(e) => setName(e.target.value)} />

      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <label className="section-label" style={{ margin: 0 }}>When</label>
        <select style={field} value={triggerKind} onChange={(e) => setTriggerKind(e.target.value as Trigger['kind'])}>
          {Object.entries(TRIGGER_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        {triggerKind === 'time' && <input style={field} type="time" value={at} onChange={(e) => setAt(e.target.value)} />}
        {triggerKind === 'health_metric' && (
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <select style={{ ...field, flex: 1 }} value={metric} onChange={(e) => setMetric(e.target.value)}>
              {['readiness', 'sleepDebtMin', 'hrvMs', 'restingHr'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select style={field} value={op} onChange={(e) => setOp(e.target.value)}>
              {['lt', 'lte', 'gt', 'gte', 'eq'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input style={{ ...field, width: 80 }} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        )}
        {triggerKind === 'event_starting' && (
          <input style={field} type="number" value={minutesBefore} onChange={(e) => setMinutesBefore(e.target.value)} placeholder="minutes before" />
        )}
        {triggerKind === 'ha_state' && (
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <input style={{ ...field, flex: 1 }} placeholder="entity_id (e.g. binary_sensor.door)" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            <input style={{ ...field, width: 120 }} placeholder="equals" value={equals} onChange={(e) => setEquals(e.target.value)} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
        <label className="section-label" style={{ margin: 0 }}>Do</label>
        <select style={field} value={actionKind} onChange={(e) => setActionKind(e.target.value as Action['kind'])}>
          {(['notify', 'ha_scene', 'create_task', 'replan_day', 'ai_job'] as const).map((k) => (
            <option key={k} value={k}>{ACTION_LABEL[k]}</option>
          ))}
        </select>
        {actionKind === 'notify' && (
          <>
            <input style={field} placeholder="Notification title" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            <input style={field} placeholder="Body (optional)" value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} />
          </>
        )}
        {actionKind === 'ha_scene' && <input style={field} placeholder="scene.entity_id" value={sceneEntity} onChange={(e) => setSceneEntity(e.target.value)} />}
        {actionKind === 'create_task' && <input style={field} placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />}
        {actionKind === 'ai_job' && (
          <select style={field} value={aiJobType} onChange={(e) => setAiJobType(e.target.value)}>
            {['plan_day', 'briefing', 'health_insight', 'weekly_review', 'email_triage'].map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        )}
      </div>

      <button className="btn-glow" onClick={() => void save()} style={{ justifySelf: 'start' }}>Create routine</button>
    </div>
  );
}
