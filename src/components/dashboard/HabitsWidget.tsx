'use client';

import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Day {
  date: string;
  done: boolean;
}

interface Habit {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  streak: number;
  doneToday: boolean;
  days: Day[];
}

export function HabitsWidget() {
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/habits');
    const json = await res.json();
    setHabits(json.habits ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string) {
    setHabits((prev) =>
      prev
        ? prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  doneToday: !h.doneToday,
                  streak: !h.doneToday ? h.streak + 1 : Math.max(0, h.streak - 1),
                  days: h.days.map((d, i) =>
                    i === h.days.length - 1 ? { ...d, done: !h.doneToday } : d,
                  ),
                }
              : h,
          )
        : prev,
    );
    await fetch(`/api/habits/${id}`, { method: 'POST' });
    load();
  }

  async function addHabit() {
    if (!name.trim()) return;
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    setAdding(false);
    load();
  }

  async function removeHabit(id: string) {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <GlassCard>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--leather-light)',
            fontWeight: 600,
          }}
        >
          Habits
        </h2>
        <button
          onClick={() => setAdding((a) => !a)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(216, 204, 192,0.2)',
            color: 'var(--muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.125rem 0.5rem',
            fontSize: '0.6875rem',
            cursor: 'pointer',
          }}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="Habit name…"
            autoFocus
            style={{
              flex: 1,
              background: 'rgba(42, 47, 53, 0.55)',
              border: '1px solid rgba(216, 204, 192,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.375rem 0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--beige-light)',
              outline: 'none',
            }}
          />
          <button
            onClick={addHabit}
            disabled={!name.trim()}
            style={{
              background: 'rgba(176, 122, 79,0.22)',
              border: '1px solid rgba(176, 122, 79,0.45)',
              color: 'var(--beige-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.375rem 0.625rem',
              fontSize: '0.75rem',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      )}

      {!habits ? (
        <div className="skeleton" style={{ height: 80, width: '100%' }} />
      ) : habits.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
          No habits yet. Add one to start tracking.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.375rem' }}>
          {habits.map((h) => (
            <li
              key={h.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto auto',
                gap: '0.625rem',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: h.doneToday ? 'rgba(111,158,122,0.08)' : 'transparent',
              }}
            >
              <button
                onClick={() => toggle(h.id)}
                aria-pressed={h.doneToday}
                aria-label={`Toggle ${h.name}`}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${h.doneToday ? 'var(--success)' : 'rgba(216, 204, 192,0.3)'}`,
                  background: h.doneToday ? 'var(--success)' : 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 160ms var(--ease-out)',
                }}
              />
              <span
                style={{
                  color: 'var(--beige-light)',
                  fontSize: '0.875rem',
                  opacity: h.doneToday ? 1 : 0.9,
                }}
              >
                {h.name}
              </span>
              <div style={{ display: 'flex', gap: 2 }} aria-label={`7-day heatmap for ${h.name}`}>
                {h.days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.done ? 'done' : 'missed'}`}
                    style={{
                      width: 8,
                      height: 16,
                      borderRadius: 2,
                      background: d.done ? 'rgba(111,158,122,0.7)' : 'rgba(216, 204, 192,0.12)',
                    }}
                  />
                ))}
              </div>
              <span
                title={`${h.streak}-day streak`}
                style={{ fontSize: '0.75rem', color: 'var(--muted)', minWidth: 28, textAlign: 'right' }}
              >
                {h.streak > 0 ? `🔥${h.streak}` : '—'}
              </span>
              {adding && (
                <button
                  onClick={() => removeHabit(h.id)}
                  aria-label={`Remove ${h.name}`}
                  style={{
                    gridColumn: '1 / -1',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger-soft)',
                    fontSize: '0.6875rem',
                    cursor: 'pointer',
                    justifySelf: 'end',
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
