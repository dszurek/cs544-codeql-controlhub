'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';

interface SlipTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: number;
  status: string;
  createdAt: string;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then) / (24 * 60 * 60 * 1000));
}

export function SlippingWidget() {
  const router = useRouter();
  const [overdue, setOverdue] = useState<SlipTask[]>([]);
  const [stalled, setStalled] = useState<SlipTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tasks/slipping')
      .then((r) => r.json())
      .then((d: { overdue: SlipTask[]; stalled: SlipTask[] }) => {
        if (cancelled) return;
        setOverdue(d.overdue ?? []);
        setStalled(d.stalled ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = overdue.length + stalled.length;

  return (
    <GlassCard>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.625rem',
        }}
      >
        <h2
          style={{
            fontSize: '0.6875rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--leather-light)',
            fontWeight: 600,
            margin: 0,
          }}
        >
          What&apos;s slipping
        </h2>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
          {loading ? '…' : `${total} item${total === 1 ? '' : 's'}`}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>Loading…</p>
      ) : total === 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
          Nothing is slipping. Nice work.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {overdue.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/tasks/${t.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(220,53,69,0.08)',
                border: '1px solid rgba(220,53,69,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.375rem 0.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--beige-light)',
              }}
              title={t.title}
            >
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: '0.5rem',
                }}
              >
                {t.title}
              </span>
              <span style={{ color: '#f1aeb5', fontSize: '0.6875rem', flexShrink: 0 }}>
                {daysSince(t.dueDate)}d overdue
              </span>
            </button>
          ))}
          {stalled.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/tasks/${t.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(199, 154, 107,0.08)',
                border: '1px solid rgba(199, 154, 107,0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.375rem 0.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--beige-light)',
              }}
              title={t.title}
            >
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: '0.5rem',
                }}
              >
                {t.title}
              </span>
              <span style={{ color: 'var(--leather-light)', fontSize: '0.6875rem', flexShrink: 0 }}>
                stalled {daysSince(t.createdAt)}d
              </span>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
