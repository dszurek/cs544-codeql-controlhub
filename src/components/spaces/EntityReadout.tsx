'use client';

import type { HaEntityState } from '@/hooks/useHaWebSocket';
import { titleize } from '@/lib/haDomains';

/**
 * A passive reading — sensors, trackers, weather, update entities. No controls,
 * just the value in the instrument-readout type so a wall of them stays
 * scannable at kiosk distance.
 */
export function EntityReadout({ entity }: { entity: HaEntityState }) {
  const name =
    (entity.attributes.friendly_name as string) ??
    titleize(entity.entity_id.split('.')[1] ?? entity.entity_id);
  const unit = entity.attributes.unit_of_measurement as string | undefined;

  const unavailable = entity.state === 'unavailable' || entity.state === 'unknown';
  const value = unavailable ? '—' : entity.state;

  return (
    <div
      className="glass-card"
      style={{ padding: '0.625rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}
      title={entity.entity_id}
    >
      <span
        style={{
          fontSize: '0.6875rem',
          color: 'rgba(216, 204, 192, 0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
      <span
        className="readout"
        style={{
          fontSize: '0.9375rem',
          color: unavailable ? 'rgba(216, 204, 192, 0.35)' : 'var(--beige-light)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
        {unit && !unavailable && <span className="readout-unit"> {unit}</span>}
      </span>
    </div>
  );
}
