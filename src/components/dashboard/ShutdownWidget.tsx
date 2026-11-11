'use client';

import { useCallback, useEffect, useState } from 'react';

interface ShutdownTask {
  id: string;
  title: string;
  priority: number;
  status: string;
}

interface ShutdownLog {
  incompleteTaskIds: string[];
  tomorrowTopIds: string[];
  journal: string | null;
  createdAt: string;
}

type TaskDisposition = 'keep' | 'reschedule' | 'drop';

const SHUTDOWN_HOUR = 21; // 9pm local

export function ShutdownWidget() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<ShutdownLog | null>(null);
  const [incomplete, setIncomplete] = useState<ShutdownTask[]>([]);
  const [tomorrow, setTomorrow] = useState<ShutdownTask[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, TaskDisposition>>({});
  const [pickedTomorrow, setPickedTomorrow] = useState<Set<string>>(new Set());
  const [journal, setJournal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    fetch('/api/shutdown')
      .then((r) => r.json())
      .then((data) => {
        setLog(data.log);
        setIncomplete(data.context?.incompleteToday ?? []);
        setTomorrow(data.context?.tomorrowTop ?? []);
        if (data.log?.journal) setJournal(data.log.journal);
        if (data.log?.tomorrowTopIds) {
          setPickedTomorrow(new Set(data.log.tomorrowTopIds));
        }
      })
      .catch(() => setError('Failed to load shutdown context'));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [load]);

  const afterShutdownHour = now.getHours() >= SHUTDOWN_HOUR;
  const completedToday = !!log && log.createdAt
    ? new Date(log.createdAt).toDateString() === now.toDateString()
    : false;

  async function applyDispositions() {
    // Apply reschedule (push to tomorrow) and drop (mark cancelled) server-side
    const updates: Array<Promise<Response>> = [];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    tomorrowDate.setHours(0, 0, 0, 0);
    for (const [taskId, disposition] of Object.entries(dispositions)) {
      if (disposition === 'reschedule') {
        updates.push(
          fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dueDate: tomorrowDate.toISOString() }),
          }),
        );
      } else if (disposition === 'drop') {
        updates.push(
          fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' }),
          }),
        );
      }
    }
    await Promise.allSettled(updates);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await applyDispositions();
      const res = await fetch('/api/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incompleteTaskIds: incomplete.map((t) => t.id),
          tomorrowTopIds: [...pickedTomorrow],
          journal: journal.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      load();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function toggleTomorrow(id: string) {
    setPickedTomorrow((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  function setDisposition(id: string, d: TaskDisposition) {
    setDispositions((prev) => ({ ...prev, [id]: d }));
  }

  // Only render at all after shutdown hour OR if completed today (to show recap)
  if (!afterShutdownHour && !completedToday) return null;

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: '0.625rem',
    padding: '1px 5px',
    borderRadius: 3,
    letterSpacing: '0.06em',
    marginRight: 6,
  };

  const btnStyle: React.CSSProperties = {
    background: 'rgba(176, 122, 79,0.3)',
    border: '1px solid rgba(176, 122, 79,0.5)',
    color: 'var(--leather-light)',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  };

  const dispBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(176, 122, 79,0.4)' : 'none',
    border: '1px solid rgba(216, 204, 192,0.2)',
    color: active ? 'var(--leather-light)' : 'var(--muted)',
    borderRadius: 3,
    padding: '2px 6px',
    cursor: 'pointer',
    fontSize: '0.6875rem',
  });

  return (
    <div
      style={{
        background: 'rgba(42, 47, 53, 0.40)',
        border: '1px solid rgba(199, 154, 107,0.3)',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h3 style={{ fontFamily: 'var(--font-playfair)', color: 'var(--leather-light)', margin: 0, fontSize: '1rem' }}>
          Shutdown ritual
        </h3>
        {completedToday ? (
          <span style={{ ...badgeStyle, background: 'rgba(40,167,69,0.2)', color: 'rgb(40,167,69)' }}>Done today</span>
        ) : (
          <span style={{ ...badgeStyle, background: 'rgba(199, 154, 107,0.2)', color: 'var(--leather-light)' }}>
            Close the day
          </span>
        )}
        <button onClick={() => setOpen((v) => !v)} style={{ ...btnStyle, marginLeft: 'auto' }}>
          {open ? 'Hide' : completedToday ? 'View' : 'Start'}
        </button>
      </div>

      {!open && !completedToday && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
          {incomplete.length} task{incomplete.length === 1 ? '' : 's'} still pending today.
        </p>
      )}

      {!open && completedToday && log && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>
          {log.tomorrowTopIds.length} task{log.tomorrowTopIds.length === 1 ? '' : 's'} queued for tomorrow.
        </p>
      )}

      {open && (
        <div style={{ marginTop: '0.75rem' }}>
          {/* Incomplete today */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--leather-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              Today ({incomplete.length})
            </div>
            {incomplete.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>Nothing left.</p>
            )}
            {incomplete.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0',
                  borderBottom: '1px solid rgba(216, 204, 192,0.08)',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ flex: 1, color: 'var(--beige-light)' }}>{t.title}</span>
                <button onClick={() => setDisposition(t.id, 'keep')} style={dispBtnStyle(dispositions[t.id] === 'keep')}>
                  Keep
                </button>
                <button onClick={() => setDisposition(t.id, 'reschedule')} style={dispBtnStyle(dispositions[t.id] === 'reschedule')}>
                  → Tomorrow
                </button>
                <button onClick={() => setDisposition(t.id, 'drop')} style={dispBtnStyle(dispositions[t.id] === 'drop')}>
                  Drop
                </button>
              </div>
            ))}
          </div>

          {/* Tomorrow top 3 */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--leather-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              Tomorrow — pick up to 3 ({pickedTomorrow.size}/3)
            </div>
            {tomorrow.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No tasks due tomorrow.</p>
            )}
            {tomorrow.map((t) => {
              const picked = pickedTomorrow.has(t.id);
              return (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={picked}
                    onChange={() => toggleTomorrow(t.id)}
                    disabled={!picked && pickedTomorrow.size >= 3}
                  />
                  <span style={{ color: picked ? 'var(--leather-light)' : 'var(--beige-light)' }}>{t.title}</span>
                </label>
              );
            })}
          </div>

          {/* Journal */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--leather-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              One-line journal
            </div>
            <input
              type="text"
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="How did today go?"
              maxLength={280}
              style={{
                width: '100%',
                background: 'rgba(42, 47, 53, 0.55)',
                border: '1px solid rgba(216, 204, 192,0.15)',
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                color: 'var(--beige-light)',
                boxSizing: 'border-box',
                fontSize: '0.8125rem',
              }}
            />
          </div>

          {error && <p style={{ color: '#dc3545', fontSize: '0.75rem' }}>{error}</p>}

          <button onClick={save} disabled={saving} style={{ ...btnStyle, padding: '6px 14px' }}>
            {saving ? 'Saving…' : completedToday ? 'Update' : 'Close the day'}
          </button>
        </div>
      )}
    </div>
  );
}
