'use client';

import { useEffect, useState } from 'react';
import { inputStyle } from './shared';

type CalendarSource = {
  id: string;
  url: string;
  label: string | null;
  color: string | null;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export function CalendarSourcesManager() {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [max, setMax] = useState(20);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/calendar/sources')
      .then((r) => r.json())
      .then((d: { sources: CalendarSource[]; max: number }) => {
        setSources(d.sources ?? []);
        if (typeof d.max === 'number') setMax(d.max);
      })
      .catch(() => setSources([]));
    fetch('/api/calendar/feed-url')
      .then((r) => r.json())
      .then((d: { url: string }) => setFeedUrl(d.url))
      .catch(() => setFeedUrl(null));
  }, []);

  async function handleAdd() {
    if (!url.trim()) {
      setError('URL required');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/calendar/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), label: label.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Failed to add source');
        return;
      }
      const body = (await res.json()) as { source: CalendarSource };
      setSources([...sources, body.source]);
      setUrl('');
      setLabel('');
    } catch {
      setError('Failed to add source');
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/calendar/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { source: CalendarSource };
      setSources(sources.map((s) => (s.id === id ? body.source : s)));
    } catch {
      /* ignore */
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/calendar/sources/${id}`, { method: 'DELETE' });
      if (res.ok) setSources(sources.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    }
  }

  async function handleSync(id: string) {
    setSyncing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/calendar/sources/${id}/sync`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        const refreshed = await fetch('/api/calendar/sources').then((r) => r.json());
        setSources(refreshed.sources ?? []);
      } else {
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, lastError: (body as { error?: string }).error ?? 'Sync failed' } : s)),
        );
      }
    } catch {
      /* ignore */
    }
    setSyncing((prev) => ({ ...prev, [id]: false }));
  }

  async function handleRotateToken() {
    try {
      const res = await fetch('/api/calendar/feed-url', { method: 'POST' });
      if (!res.ok) return;
      const refreshed = await fetch('/api/calendar/feed-url').then((r) => r.json());
      setFeedUrl(refreshed.url);
    } catch {
      /* ignore */
    }
  }

  async function handleCopy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
    } catch {
      /* ignore */
    }
  }

  const smallButton: React.CSSProperties = {
    padding: '0.4375rem 1rem',
    background: 'rgba(176, 122, 79,0.25)',
    border: '1px solid rgba(176, 122, 79,0.4)',
    borderRadius: '6px',
    color: 'var(--leather-light)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  };

  const atLimit = sources.length >= max;

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
        Subscribe to remote .ics feeds (Google, Outlook publish URL, institutional calendars).
        Up to {max} sources. Events land alongside other calendars.
      </p>

      {sources.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {sources.map((src) => (
            <div
              key={src.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.40)',
                border: '1px solid rgba(216, 204, 192,0.1)',
                borderRadius: '6px',
                opacity: src.enabled ? 1 : 0.5,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--beige-light)', fontSize: '0.8125rem' }}>
                  {src.label ?? src.url}
                </div>
                {src.label && (
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: '0.6875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {src.url}
                  </div>
                )}
                {src.lastError && (
                  <div style={{ color: '#dc3545', fontSize: '0.6875rem' }}>
                    {src.lastError}
                  </div>
                )}
                {src.lastSyncedAt && !src.lastError && (
                  <div style={{ color: 'var(--forest-light)', fontSize: '0.6875rem' }}>
                    Last sync: {new Date(src.lastSyncedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSync(src.id)}
                disabled={syncing[src.id]}
                aria-label={`Sync ${src.url}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(216, 204, 192,0.25)',
                  color: 'var(--leather-light)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: syncing[src.id] ? 'not-allowed' : 'pointer',
                }}
              >
                {syncing[src.id] ? 'Syncing…' : 'Sync'}
              </button>
              <button
                onClick={() => handleToggle(src.id, !src.enabled)}
                aria-label={`${src.enabled ? 'Disable' : 'Enable'} ${src.url}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(216, 204, 192,0.25)',
                  color: 'var(--leather-light)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {src.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleRemove(src.id)}
                aria-label={`Remove ${src.url}`}
                style={{
                  background: 'none',
                  border: '1px solid rgba(220,53,69,0.4)',
                  color: '#dc3545',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: sources.length > 0 ? '1px solid rgba(216, 204, 192,0.1)' : 'none',
          paddingTop: sources.length > 0 ? '1rem' : 0,
          display: 'grid',
          gap: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        <input
          aria-label="ICS feed URL"
          placeholder="https://calendar.example.com/feed.ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />
        <input
          aria-label="Label"
          placeholder="Label (optional, e.g. Work)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={handleAdd}
          disabled={atLimit}
          style={{ ...smallButton, opacity: atLimit ? 0.5 : 1, cursor: atLimit ? 'not-allowed' : 'pointer' }}
        >
          {atLimit ? `Max ${max} reached` : 'Add ICS source'}
        </button>
        {error && <p style={{ color: '#dc3545', fontSize: '0.75rem', margin: 0 }}>{error}</p>}
      </div>

      {feedUrl && (
        <div
          style={{
            borderTop: '1px solid rgba(216, 204, 192,0.1)',
            paddingTop: '1rem',
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--leather-light)',
            }}
          >
            Subscribable merged feed
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
            Subscribe from any calendar app to see all ControlHub events in one place. Keep this
            URL private; rotating invalidates existing subscriptions.
          </p>
          <input
            readOnly
            value={feedUrl}
            onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCopy} style={smallButton}>
              Copy URL
            </button>
            <button
              onClick={handleRotateToken}
              style={{ ...smallButton, background: 'rgba(220,53,69,0.15)', borderColor: 'rgba(220,53,69,0.4)', color: '#dc3545' }}
            >
              Rotate token
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

