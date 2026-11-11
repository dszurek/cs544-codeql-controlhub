/**
 * Which Home Assistant domains Spaces knows how to show.
 *
 * Split by interaction, not by importance: `CONTROLLABLE_DOMAINS` get a card
 * with controls, `READONLY_DOMAINS` get a compact readout. Anything HA reports
 * that isn't in either list still shows up under "Other" rather than being
 * dropped — the surface is meant to be a complete view of the home.
 */

export const CONTROLLABLE_DOMAINS = [
  'light',
  'switch',
  'climate',
  'lock',
  'fan',
  'cover',
  'media_player',   // Echo Dot / Echo Auto arrive here via the Alexa integration
  'vacuum',
  'humidifier',
  'water_heater',
  'valve',
  'lawn_mower',
  'input_boolean',
  'script',
  'button',
  'automation',
  'siren',
  'remote',
] as const;

export const READONLY_DOMAINS = [
  'sensor',
  'binary_sensor',
  'device_tracker',
  'person',
  'sun',
  'weather',
  'update',
  'todo',
] as const;

/** Domains that are plumbing rather than something you'd act on. */
// `scene` is hidden here because the surface renders scenes in their own section.
const HIDDEN_DOMAINS = new Set([
  'scene', 'zone', 'tts', 'stt', 'conversation', 'tag', 'event',
]);

export type HaDomainKind = 'controllable' | 'readonly' | 'hidden';

const CONTROLLABLE = new Set<string>(CONTROLLABLE_DOMAINS);

export function domainOf(entityId: string): string {
  return entityId.split('.')[0] ?? '';
}

export function classifyDomain(domain: string): HaDomainKind {
  if (CONTROLLABLE.has(domain)) return 'controllable';
  if (HIDDEN_DOMAINS.has(domain)) return 'hidden';
  // Unknown domains fall through to readonly on purpose: a readout for
  // something we don't recognise beats silently dropping a device.
  return 'readonly';
}

/** Turn `living_room` / `light.kitchen_lamp` into something human. */
export function titleize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
