'use client';

import { useState } from 'react';
import type { HaEntityState } from '@/hooks/useHaWebSocket';

interface DeviceCardProps {
  entity: HaEntityState;
  onCallService: (domain: string, service: string, data: Record<string, unknown>) => Promise<boolean>;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(42, 47, 53, 0.45)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(216, 204, 192,0.12)',
  borderRadius: '12px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minHeight: '120px',
};

const toggleStyle = (on: boolean): React.CSSProperties => ({
  padding: '0.75rem',
  background: on ? 'var(--forest)' : 'rgba(42, 47, 53, 0.55)',
  border: `1px solid ${on ? 'var(--forest-light)' : 'rgba(216, 204, 192,0.15)'}`,
  borderRadius: '8px',
  color: on ? 'var(--beige-light)' : 'rgba(216, 204, 192,0.5)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  minHeight: '44px',
  width: '100%',
  textAlign: 'left' as const,
});

function friendlyName(entity: HaEntityState): string {
  return (entity.attributes.friendly_name as string) || entity.entity_id;
}

// ── LightCard ──────────────────────────────────────────────────────────────
function LightCard({ entity, onCallService }: DeviceCardProps) {
  const isOn = entity.state === 'on';
  const brightness = entity.attributes.brightness as number | undefined;
  const hasBrightness =
    typeof brightness !== 'undefined' ||
    ((entity.attributes.supported_features as number | undefined) ?? 0) & 1;

  const [sliderValue, setSliderValue] = useState<number>(
    typeof brightness === 'number' ? brightness : 128
  );

  async function handleToggle() {
    if (isOn) {
      await onCallService('light', 'turn_off', { entity_id: entity.entity_id });
    } else {
      await onCallService('light', 'turn_on', { entity_id: entity.entity_id });
    }
  }

  async function handleBrightness(value: number) {
    setSliderValue(value);
    if (value === 0) {
      await onCallService('light', 'turn_off', { entity_id: entity.entity_id });
    } else {
      await onCallService('light', 'turn_on', { entity_id: entity.entity_id, brightness: value });
    }
  }

  const brightnessPercent =
    typeof brightness === 'number' ? Math.round((brightness / 255) * 100) : null;
  const stateLabel = isOn
    ? brightnessPercent !== null
      ? `On • ${brightnessPercent}%`
      : 'On'
    : 'Off';

  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--beige-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {friendlyName(entity)}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(216, 204, 192,0.5)' }}>
        {stateLabel}
      </p>
      <button
        aria-label={isOn ? 'Turn off' : 'Turn on'}
        onClick={handleToggle}
        style={toggleStyle(isOn)}
      >
        {isOn ? 'Turn Off' : 'Turn On'}
      </button>
      {hasBrightness ? (
        <input
          aria-label="Brightness"
          type="range"
          min={0}
          max={255}
          value={sliderValue}
          onChange={(e) => handleBrightness(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--forest-light)' }}
        />
      ) : null}
    </div>
  );
}

// ── SwitchCard ─────────────────────────────────────────────────────────────
function SwitchCard({ entity, onCallService }: DeviceCardProps) {
  const isOn = entity.state === 'on';

  async function handleToggle() {
    if (isOn) {
      await onCallService('switch', 'turn_off', { entity_id: entity.entity_id });
    } else {
      await onCallService('switch', 'turn_on', { entity_id: entity.entity_id });
    }
  }

  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--beige-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {friendlyName(entity)}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(216, 204, 192,0.5)' }}>
        {isOn ? 'On' : 'Off'}
      </p>
      <button
        aria-label={isOn ? 'Turn off' : 'Turn on'}
        onClick={handleToggle}
        style={toggleStyle(isOn)}
      >
        {isOn ? 'Turn Off' : 'Turn On'}
      </button>
    </div>
  );
}

// ── ThermostatCard ─────────────────────────────────────────────────────────
function ThermostatCard({ entity, onCallService }: DeviceCardProps) {
  const currentTemp = entity.attributes.current_temperature as number | undefined;
  const targetTemp = entity.attributes.temperature as number | undefined;
  const [localTarget, setLocalTarget] = useState<number>(targetTemp ?? 20);

  async function handleAdjust(delta: number) {
    const newTarget = localTarget + delta;
    setLocalTarget(newTarget);
    await onCallService('climate', 'set_temperature', {
      entity_id: entity.entity_id,
      temperature: newTarget,
    });
  }

  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--beige-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {friendlyName(entity)}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--beige-light)',
        }}
      >
        {currentTemp !== undefined ? `${currentTemp}°` : '—'}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(216, 204, 192,0.5)' }}>
        Mode: {entity.state}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto' }}>
        <button
          aria-label="Decrease temperature"
          onClick={() => handleAdjust(-1)}
          style={{
            ...toggleStyle(false),
            width: '44px',
            height: '44px',
            textAlign: 'center',
            fontSize: '1.25rem',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          −
        </button>
        <span style={{ color: 'var(--beige-light)', fontSize: '1rem', minWidth: '48px', textAlign: 'center' }}>
          {localTarget}°
        </span>
        <button
          aria-label="Increase temperature"
          onClick={() => handleAdjust(1)}
          style={{
            ...toggleStyle(false),
            width: '44px',
            height: '44px',
            textAlign: 'center',
            fontSize: '1.25rem',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── LockCard ───────────────────────────────────────────────────────────────
function LockCard({ entity, onCallService }: DeviceCardProps) {
  const isLocked = entity.state === 'locked';

  async function handleToggle() {
    if (isLocked) {
      await onCallService('lock', 'unlock', { entity_id: entity.entity_id });
    } else {
      await onCallService('lock', 'lock', { entity_id: entity.entity_id });
    }
  }

  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--beige-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {friendlyName(entity)}
      </p>
      <p style={{ margin: 0, fontSize: '1.5rem' }}>{isLocked ? '🔒' : '🔓'}</p>
      <button
        aria-label={isLocked ? 'Unlock' : 'Lock'}
        onClick={handleToggle}
        style={toggleStyle(!isLocked)}
      >
        {isLocked ? 'Unlock' : 'Lock'}
      </button>
    </div>
  );
}

// ── GenericToggleCard ──────────────────────────────────────────────────────
function GenericToggleCard({ entity, onCallService }: DeviceCardProps) {
  const domain = entity.entity_id.split('.')[0];
  const isOn = entity.state === 'on';

  async function handleToggle() {
    if (isOn) {
      await onCallService(domain, 'turn_off', { entity_id: entity.entity_id });
    } else {
      await onCallService(domain, 'turn_on', { entity_id: entity.entity_id });
    }
  }

  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--beige-light)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {friendlyName(entity)}
      </p>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(216, 204, 192,0.5)' }}>
        {isOn ? 'On' : 'Off'}
      </p>
      <button
        aria-label={isOn ? 'Turn off' : 'Turn on'}
        onClick={handleToggle}
        style={toggleStyle(isOn)}
      >
        {isOn ? 'Turn Off' : 'Turn On'}
      </button>
    </div>
  );
}

// ── MediaPlayerCard ────────────────────────────────────────────────────────
// Where Echo speakers land via the Alexa Devices integration, alongside any
// other media player. Transport controls are gated on `supported_features`
// because a speaker that can't seek shouldn't show a skip button.
const MEDIA_PAUSE = 1;
const MEDIA_PREV = 16;
const MEDIA_NEXT = 32;
const MEDIA_PLAY = 16384;

function MediaPlayerCard({ entity, onCallService }: DeviceCardProps) {
  const [busy, setBusy] = useState(false);
  const state = entity.state;
  const off = state === 'off' || state === 'standby' || state === 'unavailable';
  const playing = state === 'playing';
  const features = (entity.attributes.supported_features as number) ?? 0;
  const can = (bit: number) => (features & bit) !== 0;

  const title = entity.attributes.media_title as string | undefined;
  const artist = entity.attributes.media_artist as string | undefined;

  async function call(service: string) {
    setBusy(true);
    await onCallService('media_player', service, { entity_id: entity.entity_id });
    setBusy(false);
  }

  const btn: React.CSSProperties = {
    flex: 1,
    padding: '0.5rem',
    background: 'rgba(42, 47, 53, 0.55)',
    border: '1px solid rgba(216, 204, 192,0.15)',
    borderRadius: '8px',
    color: 'var(--beige-light)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    minHeight: '44px',
  };

  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--beige-light)' }}>
        {friendlyName(entity)}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          color: 'rgba(216, 204, 192,0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={title ? `${title}${artist ? ` — ${artist}` : ''}` : undefined}
      >
        {title ? (artist ? `${title} — ${artist}` : title) : off ? 'Idle' : state}
      </p>

      <div style={{ display: 'flex', gap: '0.375rem', marginTop: 'auto' }}>
        {can(MEDIA_PREV) && (
          <button aria-label="Previous track" disabled={busy} onClick={() => call('media_previous_track')} style={btn}>
            ‹‹
          </button>
        )}
        {(can(MEDIA_PLAY) || can(MEDIA_PAUSE)) && (
          <button
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={busy}
            onClick={() => call(playing ? 'media_pause' : 'media_play')}
            style={{ ...btn, background: playing ? 'var(--forest)' : btn.background }}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        )}
        {can(MEDIA_NEXT) && (
          <button aria-label="Next track" disabled={busy} onClick={() => call('media_next_track')} style={btn}>
            ››
          </button>
        )}
      </div>
    </div>
  );
}

// ── DeviceCard dispatcher ──────────────────────────────────────────────────
export function DeviceCard({ entity, onCallService }: DeviceCardProps) {
  const domain = entity.entity_id.split('.')[0];

  switch (domain) {
    case 'light':
      return <LightCard entity={entity} onCallService={onCallService} />;
    case 'switch':
      return <SwitchCard entity={entity} onCallService={onCallService} />;
    case 'climate':
      return <ThermostatCard entity={entity} onCallService={onCallService} />;
    case 'lock':
      return <LockCard entity={entity} onCallService={onCallService} />;
    case 'media_player':
      return <MediaPlayerCard entity={entity} onCallService={onCallService} />;
    default:
      return <GenericToggleCard entity={entity} onCallService={onCallService} />;
  }
}
