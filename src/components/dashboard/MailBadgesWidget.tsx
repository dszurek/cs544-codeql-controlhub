'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface MailInsights {
  outlook: number;
  gmail: number;
  alerts: Array<{
    ruleId: string;
    label: string;
    pattern: string;
    count: number;
    latest: {
      id: string;
      subject: string;
      senderName: string;
      senderEmail: string;
      receivedAt: string;
    } | null;
  }>;
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 0.75rem 0',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
};

const sourceRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  textDecoration: 'none',
  color: 'inherit',
};

export function MailBadgesWidget() {
  const [data, setData] = useState<MailInsights>({ outlook: 0, gmail: 0, alerts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/mail/insights');
        if (!res.ok) throw new Error('Failed to load mail');
        const json: MailInsights = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Couldn't load mail");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GlassCard>
      <h2 style={headingStyle}>Mail</h2>

      {error && <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

      {!error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href="/mail" style={sourceRowStyle}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: '#0078d4',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--beige)', flex: 1 }}>Outlook</span>
            <span
              style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                lineHeight: 1,
                color:
                  loading || data.outlook === 0 ? 'var(--muted)' : 'var(--beige-light)',
                minWidth: '2.5rem',
                textAlign: 'right',
              }}
            >
              {loading ? '—' : data.outlook}
            </span>
          </a>

          <a href="/mail" style={sourceRowStyle}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: '#ea4335',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--beige)', flex: 1 }}>Gmail</span>
            <span
              style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                lineHeight: 1,
                color: loading || data.gmail === 0 ? 'var(--muted)' : 'var(--beige-light)',
                minWidth: '2.5rem',
                textAlign: 'right',
              }}
            >
              {loading ? '—' : data.gmail}
            </span>
          </a>

          {data.alerts.length > 0 && (
            <div
              style={{
                marginTop: '0.625rem',
                paddingTop: '0.625rem',
                borderTop: '1px solid rgba(216, 204, 192, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
              }}
            >
              {data.alerts.map((alert) => (
                <a
                  key={alert.ruleId}
                  href="/mail"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(220, 53, 69, 0.3)',
                    background: 'rgba(220, 53, 69, 0.08)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '0.875rem' }}>⚠</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--beige-light)',
                        fontWeight: 600,
                      }}
                    >
                      {alert.label} · {alert.count}
                    </div>
                    {alert.latest && (
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {alert.latest.subject || '(no subject)'}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
