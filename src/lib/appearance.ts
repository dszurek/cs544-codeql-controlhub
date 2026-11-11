/**
 * Appearance customization — user-tunable design tokens applied as
 * :root CSS-var overrides. This module is PURE (no DB import) so it can
 * be bundled into the client appearance panel for live preview. The
 * DB-backed get/set live in ./appearanceStore.
 */
export interface Appearance {
  accent: AccentName;
  ambientIntensity: number; // 0–1.5 → --amb-intensity
  fontScale: number;        // 0.9–1.15 → :root font-size
  density: Density;         // scales the --sp-* spacing scale
  glassOpacity: number;     // 0.5–1.4 multiplier on glass background alpha
  blur: BlurBudget;         // backdrop-filter budget (the Pi perf lever)
}

export type AccentName = 'leather' | 'forest' | 'amber' | 'slate' | 'crimson';
export type Density = 'compact' | 'cozy' | 'comfortable';
export type BlurBudget = 'full' | 'reduced' | 'off';

export const DEFAULT_APPEARANCE: Appearance = {
  accent: 'leather',
  ambientIntensity: 1,
  fontScale: 1,
  density: 'cozy',
  glassOpacity: 1,
  blur: 'full',
};

export const ACCENTS: Record<AccentName, { base: string; light: string; label: string }> = {
  leather: { base: '#b07a4f', light: '#c79a6b', label: 'Leather' },
  forest: { base: '#3f6353', light: '#5a8270', label: 'Forest' },
  amber: { base: '#c0883c', light: '#d9a45f', label: 'Amber' },
  slate: { base: '#5a6b7a', light: '#8097a8', label: 'Slate' },
  crimson: { base: '#a14a4a', light: '#c46b6b', label: 'Crimson' },
};

const DENSITY_SCALE: Record<Density, number> = { compact: 0.82, cozy: 1, comfortable: 1.18 };
const BLUR: Record<BlurBudget, { pane: number; card: number; float: number }> = {
  full: { pane: 8, card: 14, float: 22 },
  reduced: { pane: 4, card: 7, float: 11 },
  off: { pane: 0, card: 0, float: 0 },
};

// Base spacing scale (rem) and glass alphas, kept in sync with globals.css.
const SP_BASE: Record<string, number> = {
  '--sp-1': 0.25, '--sp-2': 0.5, '--sp-3': 0.75, '--sp-4': 1,
  '--sp-5': 1.25, '--sp-6': 1.5, '--sp-8': 2,
};
const GLASS = {
  pane: { rgb: '42, 47, 53', a: 0.3 },
  card: { rgb: '42, 47, 53', a: 0.5 },
  float: { rgb: '28, 31, 35', a: 0.88 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Normalize an arbitrary parsed object into a valid Appearance. */
export function coerceAppearance(raw: unknown): Appearance {
  const r = (raw ?? {}) as Record<string, unknown>;
  const accent = (Object.keys(ACCENTS) as AccentName[]).includes(r.accent as AccentName)
    ? (r.accent as AccentName)
    : DEFAULT_APPEARANCE.accent;
  const density = (['compact', 'cozy', 'comfortable'] as Density[]).includes(r.density as Density)
    ? (r.density as Density)
    : DEFAULT_APPEARANCE.density;
  const blur = (['full', 'reduced', 'off'] as BlurBudget[]).includes(r.blur as BlurBudget)
    ? (r.blur as BlurBudget)
    : DEFAULT_APPEARANCE.blur;
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  return {
    accent,
    density,
    blur,
    ambientIntensity: clamp(num(r.ambientIntensity, 1), 0, 1.5),
    fontScale: clamp(num(r.fontScale, 1), 0.9, 1.15),
    glassOpacity: clamp(num(r.glassOpacity, 1), 0.5, 1.4),
  };
}

/** Pure: appearance → flat map of CSS custom properties to override. */
export function appearanceToCssVars(a: Appearance): Record<string, string> {
  const vars: Record<string, string> = {};
  const accent = ACCENTS[a.accent];
  vars['--leather'] = accent.base;
  vars['--leather-light'] = accent.light;
  vars['--focus-ring'] = `0 0 0 2px ${hexToRgba(accent.light, 0.5)}`;
  vars['--amb-intensity'] = String(a.ambientIntensity);

  const scale = DENSITY_SCALE[a.density];
  for (const [key, rem] of Object.entries(SP_BASE)) {
    vars[key] = `${+(rem * scale).toFixed(4)}rem`;
  }

  const blur = BLUR[a.blur];
  vars['--glass-pane-blur'] = `${blur.pane}px`;
  vars['--glass-card-blur'] = `${blur.card}px`;
  vars['--glass-float-blur'] = `${blur.float}px`;

  vars['--glass-pane-bg'] = `rgba(${GLASS.pane.rgb}, ${clamp(GLASS.pane.a * a.glassOpacity, 0, 0.98).toFixed(3)})`;
  vars['--glass-card-bg'] = `rgba(${GLASS.card.rgb}, ${clamp(GLASS.card.a * a.glassOpacity, 0, 0.98).toFixed(3)})`;
  vars['--glass-float-bg'] = `rgba(${GLASS.float.rgb}, ${clamp(GLASS.float.a * a.glassOpacity, 0, 0.99).toFixed(3)})`;

  return vars;
}

/** Render the override block as a string for a server-side <style> tag.
 *  font-size lives on :root so all rem units scale. */
export function appearanceToCss(a: Appearance): string {
  const vars = appearanceToCssVars(a);
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  return `:root{${body};font-size:${(a.fontScale * 100).toFixed(2)}%}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
