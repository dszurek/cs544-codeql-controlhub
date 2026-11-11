'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Scene {
  id: string;
  haEntityId: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

export function QuickScenesWidget() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadScenes() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/ha/scenes');
        if (!res.ok) throw new Error('Failed to load scenes');
        const data: { scenes: Scene[] } = await res.json();

        if (cancelled) return;
        setScenes(data.scenes);
      } catch {
        if (!cancelled) setError("Couldn't load scenes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadScenes();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleActivate(scene: Scene) {
    try {
      await fetch('/api/ha/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'scene',
          service: 'turn_on',
          serviceData: { entity_id: scene.haEntityId },
        }),
      });

      setActivating((prev) => ({ ...prev, [scene.id]: true }));
      setTimeout(() => {
        setActivating((prev) => ({ ...prev, [scene.id]: false }));
      }, 1500);
    } catch {
      // Swallow errors silently
    }
  }

  return (
    <GlassCard>
      <h2
        style={{
          margin: '0 0 0.75rem 0',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--leather-light)',
        }}
      >
        Quick scenes
      </h2>

      {loading && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Loading…</p>
      )}

      {!loading && error && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
          Couldn&apos;t load scenes
        </p>
      )}

      {!loading && !error && scenes.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
          No scenes configured
        </p>
      )}

      {!loading && !error && scenes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => handleActivate(scene)}
              style={{
                minWidth: '100px',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.75rem',
                background: 'rgba(216, 204, 192,0.06)',
                border: '1px solid rgba(216, 204, 192,0.15)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--beige-light)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(216, 204, 192,0.12)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(216, 204, 192,0.06)';
              }}
            >
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                {scene.icon ?? '✨'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  color: activating[scene.id] ? 'var(--leather-light)' : 'var(--beige)',
                  fontWeight: activating[scene.id] ? 600 : 400,
                }}
              >
                {activating[scene.id] ? 'Activated!' : scene.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
