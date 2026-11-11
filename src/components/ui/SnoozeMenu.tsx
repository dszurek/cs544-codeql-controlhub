'use client';

import { useEffect, useRef, useState } from 'react';
import { snoozePresets } from '@/lib/snoozePresets';
import { useToast } from './Toast';

interface Props {
  entityType: 'task' | 'email';
  entityId: string;
  currentUntil?: string | null;
  onChange?: (until: string | null) => void;
  buttonLabel?: string;
}

export function SnoozeMenu({
  entityType,
  entityId,
  currentUntil,
  onChange,
  buttonLabel = 'Snooze',
}: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const popRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function applySnooze(until: Date | null) {
    try {
      const res = await fetch('/api/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          until: until ? until.toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error('Snooze failed');
      const next = until ? until.toISOString() : null;
      onChange?.(next);
      setOpen(false);
      if (until) {
        toast.info(`Snoozed until ${until.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`, {
          action: {
            label: 'Undo',
            handler: async () => {
              await fetch('/api/snooze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityType, entityId, until: null }),
              });
              onChange?.(null);
            },
          },
        });
      } else {
        toast.info('Snooze cleared');
      }
    } catch {
      toast.error('Couldn’t snooze');
    }
  }

  const presets = snoozePresets();

  return (
    <div style={{ position: 'relative' }} ref={popRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        title={currentUntil ? `Snoozed until ${new Date(currentUntil).toLocaleString()}` : buttonLabel}
        style={{
          background: currentUntil ? 'rgba(199, 154, 107,0.18)' : 'transparent',
          border: '1px solid rgba(216, 204, 192,0.2)',
          color: currentUntil ? 'var(--leather-light)' : 'var(--muted)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem 0.625rem',
          fontSize: '0.75rem',
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        ⏰ {currentUntil ? 'Snoozed' : buttonLabel}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 220,
            background: 'rgba(28, 31, 35, 0.95)',
            border: '1px solid rgba(216, 204, 192,0.18)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-2)',
            padding: '0.375rem',
            zIndex: 200,
          }}
        >
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applySnooze(p.at)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--beige-light)',
                padding: '0.5rem 0.625rem',
                fontSize: '0.8125rem',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(216, 204, 192,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{p.label}</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>
                {p.at.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </button>
          ))}
          <div
            style={{
              borderTop: '1px solid rgba(216, 204, 192,0.1)',
              marginTop: '0.25rem',
              paddingTop: '0.375rem',
              display: 'flex',
              gap: '0.25rem',
            }}
          >
            <input
              type="datetime-local"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(42, 47, 53, 0.55)',
                border: '1px solid rgba(216, 204, 192,0.15)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.375rem',
                fontSize: '0.75rem',
                color: 'var(--beige-light)',
              }}
            />
            <button
              onClick={() => custom && applySnooze(new Date(custom))}
              disabled={!custom}
              style={{
                background: 'rgba(176, 122, 79,0.22)',
                border: '1px solid rgba(176, 122, 79,0.45)',
                color: 'var(--beige-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                cursor: custom ? 'pointer' : 'not-allowed',
                opacity: custom ? 1 : 0.5,
              }}
            >
              Go
            </button>
          </div>
          {currentUntil && (
            <button
              onClick={() => applySnooze(null)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                background: 'transparent',
                border: '1px solid rgba(220,53,69,0.35)',
                color: 'var(--danger-soft)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.375rem 0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Clear snooze
            </button>
          )}
        </div>
      )}
    </div>
  );
}
