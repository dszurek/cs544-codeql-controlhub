'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/Toast';

interface Note {
  id: string;
  date: string;
  body: string;
  migratedFrom?: string;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function shiftDate(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`;
}

export function DailyNoteView({ compact = false }: { compact?: boolean }) {
  const [date, setDate] = useState<string>(isoToday());
  const [note, setNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/daily-note?date=${date}`);
    const json = await res.json();
    setNote(json.note);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    (body: string) => {
      setSaving('saving');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await fetch('/api/daily-note', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, body }),
          });
          setSaving('saved');
          setTimeout(() => setSaving('idle'), 1200);
        } catch {
          toast.error('Couldn’t save note');
          setSaving('idle');
        }
      }, 600);
    },
    [date, toast],
  );

  if (!note) {
    return (
      <GlassCard>
        <div className="skeleton" style={{ height: 140, width: '100%' }} />
      </GlassCard>
    );
  }

  const isToday = date === isoToday();

  return (
    <GlassCard>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--leather-light)',
              fontWeight: 600,
            }}
          >
            Daily Note
          </h2>
          <div style={{ color: 'var(--beige-light)', fontSize: '0.9375rem' }}>
            {prettyDate(date)}
            {note.migratedFrom && (
              <span
                style={{ color: 'var(--muted)', fontSize: '0.6875rem', marginLeft: '0.5rem' }}
              >
                (carried {note.migratedFrom})
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            style={navBtn}
            aria-label="Previous day"
          >
            ‹
          </button>
          {!isToday && (
            <button onClick={() => setDate(isoToday())} style={navBtn}>
              Today
            </button>
          )}
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            style={navBtn}
            aria-label="Next day"
          >
            ›
          </button>
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--muted)',
              marginLeft: '0.5rem',
              minWidth: 40,
              textAlign: 'right',
            }}
          >
            {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : ''}
          </span>
        </div>
      </div>

      <textarea
        key={note.id}
        defaultValue={note.body}
        onChange={(e) => save(e.target.value)}
        placeholder="Jot thoughts. - [ ] items roll over to tomorrow automatically."
        style={{
          width: '100%',
          minHeight: compact ? 140 : 400,
          background: 'rgba(42, 47, 53, 0.50)',
          border: '1px solid rgba(216, 204, 192,0.12)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          color: 'var(--beige-light)',
          fontSize: '0.9375rem',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </GlassCard>
  );
}

const navBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(216, 204, 192,0.2)',
  color: 'var(--muted)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
};
