'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveHaBrowserUrl, isMixedContentBlocked } from '@/lib/haBrowserUrl';

/**
 * The full Home Assistant UI, embedded in ControlHub's shell.
 *
 * Deliberately an iframe rather than a reimplementation: HA's own settings,
 * device pages and integration wizards are the only place new integrations can
 * actually be configured, and they change every release. Framing it means
 * everything works the day HA ships it.
 *
 * Requires `use_x_frame_options: false` in HA's configuration.yaml — the seed
 * config in deploy/homeassistant/ sets it.
 */

interface Shortcut {
  label: string;
  path: string;
  hint: string;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Overview',     path: '/lovelace/0',                 hint: 'HA dashboard' },
  { label: 'Devices',      path: '/config/devices/dashboard',   hint: 'Every paired device' },
  { label: 'Entities',     path: '/config/entities',            hint: 'Every entity' },
  { label: 'Integrations', path: '/config/integrations',        hint: 'Add Matter, HomeKit, Alexa…' },
  { label: 'Automations',  path: '/config/automation/dashboard',hint: 'HA automations' },
  { label: 'Settings',     path: '/config/dashboard',           hint: 'All HA settings' },
  { label: 'Logs',         path: '/config/logs',                hint: 'System log' },
];

const noteStyle: React.CSSProperties = {
  color: 'rgba(216, 204, 192, 0.5)',
  fontSize: '0.875rem',
  margin: 0,
  lineHeight: 1.6,
};

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ ...noteStyle, color: 'var(--beige-light)', marginBottom: '0.5rem' }}>{title}</p>
      <div style={noteStyle}>{children}</div>
    </div>
  );
}

export function HomeAssistantPanel() {
  const [haUrl, setHaUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [path, setPath] = useState(SHORTCUTS[0].path);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ha/config')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setHaUrl(resolveHaBrowserUrl(data.url, window.location));
      })
      .catch(() => {/* leaves the not-configured notice up */})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const blocked = useMemo(
    () => typeof window !== 'undefined' && isMixedContentBlocked(haUrl, window.location),
    [haUrl],
  );

  if (!loaded) {
    return <Notice title="Connecting…">Reading your Home Assistant configuration.</Notice>;
  }

  if (!haUrl) {
    return (
      <Notice title="Home Assistant not configured">
        Add your HA URL and a long-lived access token under{' '}
        <strong style={{ color: 'var(--leather-light)' }}>Settings → Home Assistant</strong>.
      </Notice>
    );
  }

  if (blocked) {
    return (
      <Notice title="Can’t embed Home Assistant over HTTPS">
        ControlHub is served over HTTPS but Home Assistant is plain HTTP at{' '}
        <span className="readout">{haUrl}</span>, so the browser blocks it as mixed
        content. Reach the hub over Tailscale (plain HTTP) to use the embedded panel, or{' '}
        <a href={haUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--leather-light)' }}>
          open Home Assistant directly
        </a>.
      </Notice>
    );
  }

  const active = SHORTCUTS.find((s) => s.path === path) ?? SHORTCUTS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.375rem',
          alignItems: 'center',
        }}
      >
        {SHORTCUTS.map((s) => (
          <button
            key={s.path}
            onClick={() => setPath(s.path)}
            title={s.hint}
            aria-current={s.path === path ? 'true' : undefined}
            className={`surface-tab${s.path === path ? ' active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
          >
            {s.label}
          </button>
        ))}
        <a
          href={`${haUrl}${path}`}
          target="_blank"
          rel="noreferrer"
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: 'rgba(216, 204, 192, 0.5)',
            textDecoration: 'none',
          }}
        >
          Open in new tab ↗
        </a>
      </div>

      <div
        className="glass-card"
        style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 15rem)', minHeight: 420 }}
      >
        <iframe
          // Remount on navigation so the shortcut buttons actually move the
          // frame — an iframe ignores src changes once it has same-origin
          // history of its own.
          key={path}
          src={`${haUrl}${path}`}
          title={`Home Assistant — ${active.label}`}
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          // HA needs these to be fully usable: BLE/USB pairing flows, camera
          // streams for QR-code commissioning, and clipboard for tokens.
          allow="camera; microphone; clipboard-read; clipboard-write; bluetooth; usb; fullscreen; geolocation"
        />
      </div>

      <p style={{ ...noteStyle, fontSize: '0.75rem' }}>
        Home Assistant keeps its own login. Sign in once inside the panel and the
        session persists in this browser.
      </p>
    </div>
  );
}
