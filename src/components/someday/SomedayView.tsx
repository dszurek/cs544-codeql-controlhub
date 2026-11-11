'use client';

import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/Toast';

interface SomedayItem {
  id: string;
  title: string;
  notes: string | null;
  promotedTaskId: string | null;
  createdAt: string;
}

export function SomedayView() {
  const [items, setItems] = useState<SomedayItem[]>([]);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch('/api/someday');
    const json = await res.json();
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!title.trim()) return;
    await fetch('/api/someday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes: notes || undefined }),
    });
    setTitle('');
    setNotes('');
    load();
  }

  async function promote(id: string) {
    const res = await fetch(`/api/someday/${id}`, { method: 'POST' });
    if (res.ok) {
      toast.success('Promoted to task');
      load();
    } else {
      toast.error('Couldn’t promote');
    }
  }

  async function remove(id: string) {
    const snap = items.find((i) => i.id === id);
    await fetch(`/api/someday/${id}`, { method: 'DELETE' });
    load();
    if (snap) {
      toast.info(`Removed "${snap.title}"`, {
        action: {
          label: 'Undo',
          handler: async () => {
            await fetch('/api/someday', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: snap.title, notes: snap.notes ?? undefined }),
            });
            load();
          },
        },
      });
    }
  }

  const active = items.filter((i) => !i.promotedTaskId);
  const promoted = items.filter((i) => i.promotedTaskId);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <GlassCard className="reveal">
        <div className="surface-head" style={{ marginBottom: '0.25rem' }}>
          <h2 className="surface-title" style={{ fontWeight: 400 }}>Someday / Maybe</h2>
          <span className="surface-stat">{active.length} idea{active.length === 1 ? '' : 's'}</span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Ideas that aren’t actionable yet. Promote to a task when the moment is right.
        </p>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) add();
            }}
            placeholder="An idea…"
            style={inputStyle}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div>
            <button
              onClick={add}
              disabled={!title.trim()}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(176, 122, 79,0.28)',
                border: '1px solid rgba(176, 122, 79,0.55)',
                color: 'var(--beige-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                cursor: title.trim() ? 'pointer' : 'not-allowed',
                opacity: title.trim() ? 1 : 0.5,
              }}
            >
              Capture
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 style={sectionTitle}>Active ({active.length})</h3>
        {active.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Nothing here yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
            {active.map((item) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '0.625rem 0.75rem',
                  background: 'rgba(42, 47, 53, 0.40)',
                  border: '1px solid rgba(216, 204, 192,0.08)',
                  borderRadius: 'var(--radius-sm)',
                  gap: '0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--beige-light)', fontSize: '0.9375rem' }}>
                    {item.title}
                  </div>
                  {item.notes && (
                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: '0.8125rem',
                        marginTop: '0.25rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button onClick={() => promote(item.id)} style={actionBtn}>
                    Promote
                  </button>
                  <button onClick={() => remove(item.id)} style={{ ...actionBtn, color: 'var(--danger-soft)' }}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      {promoted.length > 0 && (
        <GlassCard>
          <h3 style={sectionTitle}>Promoted ({promoted.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.375rem' }}>
            {promoted.map((item) => (
              <li
                key={item.id}
                style={{
                  color: 'var(--muted)',
                  fontSize: '0.8125rem',
                  padding: '0.375rem 0.5rem',
                  textDecoration: 'line-through',
                }}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.15)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.5rem 0.75rem',
  color: 'var(--beige-light)',
  fontSize: '0.9375rem',
  fontFamily: 'var(--font-inter)',
  outline: 'none',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
  fontWeight: 600,
  marginBottom: '0.75rem',
};

const actionBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(216, 204, 192,0.2)',
  color: 'var(--beige-light)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
};
