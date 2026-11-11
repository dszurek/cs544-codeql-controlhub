'use client';

import { useEffect, useState } from 'react';
import { useHaWebSocket } from '@/hooks/useHaWebSocket';
import type { HaEntityState } from '@/hooks/useHaWebSocket';
import { SceneList } from './SceneList';
import { DeviceCard } from './DeviceCard';
import { EntityReadout } from './EntityReadout';
import { classifyDomain, domainOf, titleize } from '@/lib/haDomains';

type Scene = { id: string; haEntityId: string; name: string; icon: string | null };

async function callHaService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch('/api/ha/service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, service, serviceData }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Split every entity HA reports into controllable devices (grouped by room)
 * and passive readings. Nothing is discarded except HA's own plumbing — see
 * classifyDomain — so this really is the whole home.
 */
function partition(states: Record<string, HaEntityState>): {
  rooms: Record<string, HaEntityState[]>;
  readings: HaEntityState[];
} {
  const rooms: Record<string, HaEntityState[]> = {};
  const readings: HaEntityState[] = [];

  for (const state of Object.values(states)) {
    const kind = classifyDomain(domainOf(state.entity_id));
    if (kind === 'hidden') continue;

    if (kind === 'readonly') {
      readings.push(state);
      continue;
    }

    const area = (state.attributes.area_id as string) ?? 'Other';
    const label = area === 'Other' ? 'Other' : titleize(area);
    if (!rooms[label]) rooms[label] = [];
    rooms[label].push(state);
  }

  // "Other" last; rooms alphabetical before it.
  const ordered: Record<string, HaEntityState[]> = {};
  for (const key of Object.keys(rooms).sort((a, b) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b),
  )) {
    ordered[key] = rooms[key];
  }

  return { rooms: ordered, readings };
}

function statusDotColor(status: string): string {
  switch (status) {
    case 'connected':
      return '#22c55e';
    case 'connecting':
      return 'var(--leather)';
    case 'error':
      return '#dc3545';
    default:
      return 'rgba(216, 204, 192,0.5)';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'error':
      return 'Error';
    default:
      return 'Disconnected';
  }
}

export function SpacesView() {
  const { states, status } = useHaWebSocket();
  const [scenes, setScenes] = useState<Scene[]>([]);

  useEffect(() => {
    fetch('/api/ha/scenes')
      .then((r) => r.json())
      .then((data) => setScenes(data.scenes ?? []))
      .catch(() => {/* scenes unavailable */});
  }, []);

  const notConfigured =
    status === 'disconnected' && Object.keys(states).length === 0;

  const { rooms, readings } = partition(states);

  async function handleActivateScene(haEntityId: string): Promise<boolean> {
    return callHaService('scene', 'turn_on', { entity_id: haEntityId });
  }

  return (
    <div>
      {/* Header */}
      <div className="surface-head reveal">
        <h1 className="surface-title">Spaces</h1>
        <span className="surface-stat" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusDotColor(status),
              boxShadow: `0 0 8px ${statusDotColor(status)}`,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {statusLabel(status)}
        </span>
      </div>

      {/* Not configured message */}
      {notConfigured ? (
        <div
          style={{
            background: 'rgba(42, 47, 53, 0.45)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(216, 204, 192,0.12)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(216, 204, 192,0.5)', margin: 0, fontSize: '0.9375rem' }}>
            Home Assistant not configured. Set URL and token in Settings.
          </p>
        </div>
      ) : (
        <>
          {/* Scenes */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'rgba(216, 204, 192,0.5)',
                marginBottom: '0.75rem',
                marginTop: 0,
              }}
            >
              Scenes
            </h2>
            <SceneList scenes={scenes} onActivate={handleActivateScene} />
          </section>

          {/* Rooms */}
          {Object.keys(rooms).length === 0 ? (
            <p style={{ color: 'rgba(216, 204, 192,0.5)', fontSize: '0.875rem' }}>
              No controllable devices found.
            </p>
          ) : (
            Object.entries(rooms).map(([room, entities]) => (
              <section key={room} style={{ marginBottom: '2rem' }}>
                <h2
                  style={{
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(216, 204, 192,0.5)',
                    marginBottom: '0.75rem',
                    marginTop: 0,
                  }}
                >
                  {room}
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {entities.map((entity) => (
                    <DeviceCard
                      key={entity.entity_id}
                      entity={entity}
                      onCallService={callHaService}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {readings.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(216, 204, 192,0.5)',
                  marginBottom: '0.75rem',
                  marginTop: 0,
                }}
              >
                Readings <span className="readout">{readings.length}</span>
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                {readings.map((entity) => (
                  <EntityReadout key={entity.entity_id} entity={entity} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
