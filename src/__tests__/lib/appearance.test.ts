import { describe, it, expect } from 'vitest';
import {
  coerceAppearance,
  appearanceToCssVars,
  appearanceToCss,
  DEFAULT_APPEARANCE,
  ACCENTS,
} from '@/lib/appearance';

describe('coerceAppearance', () => {
  it('fills defaults for an empty object', () => {
    expect(coerceAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it('clamps numeric ranges', () => {
    const a = coerceAppearance({ ambientIntensity: 9, fontScale: 0.1, glassOpacity: 5 });
    expect(a.ambientIntensity).toBe(1.5);
    expect(a.fontScale).toBe(0.9);
    expect(a.glassOpacity).toBe(1.4);
  });

  it('rejects unknown enum values, keeping defaults', () => {
    const a = coerceAppearance({ accent: 'neon', density: 'huge', blur: 'max' });
    expect(a.accent).toBe('leather');
    expect(a.density).toBe('cozy');
    expect(a.blur).toBe('full');
  });

  it('accepts valid enum values', () => {
    const a = coerceAppearance({ accent: 'forest', density: 'compact', blur: 'off' });
    expect(a).toMatchObject({ accent: 'forest', density: 'compact', blur: 'off' });
  });
});

describe('appearanceToCssVars', () => {
  it('maps the accent to leather vars', () => {
    const vars = appearanceToCssVars({ ...DEFAULT_APPEARANCE, accent: 'crimson' });
    expect(vars['--leather']).toBe(ACCENTS.crimson.base);
    expect(vars['--leather-light']).toBe(ACCENTS.crimson.light);
  });

  it('scales the spacing scale by density', () => {
    const compact = appearanceToCssVars({ ...DEFAULT_APPEARANCE, density: 'compact' });
    const comfortable = appearanceToCssVars({ ...DEFAULT_APPEARANCE, density: 'comfortable' });
    expect(parseFloat(compact['--sp-4'])).toBeLessThan(1);
    expect(parseFloat(comfortable['--sp-4'])).toBeGreaterThan(1);
  });

  it('zeroes blur when budget is off', () => {
    const off = appearanceToCssVars({ ...DEFAULT_APPEARANCE, blur: 'off' });
    expect(off['--glass-pane-blur']).toBe('0px');
    expect(off['--glass-card-blur']).toBe('0px');
    expect(off['--glass-float-blur']).toBe('0px');
  });

  it('scales glass alpha by opacity and clamps', () => {
    const dense = appearanceToCssVars({ ...DEFAULT_APPEARANCE, glassOpacity: 1.4 });
    // card base alpha 0.5 × 1.4 = 0.70
    expect(dense['--glass-card-bg']).toContain('0.700');
  });

  it('passes ambient intensity straight through', () => {
    const vars = appearanceToCssVars({ ...DEFAULT_APPEARANCE, ambientIntensity: 0.4 });
    expect(vars['--amb-intensity']).toBe('0.4');
  });
});

describe('appearanceToCss', () => {
  it('emits a :root block including font-size from fontScale', () => {
    const css = appearanceToCss({ ...DEFAULT_APPEARANCE, fontScale: 1.1 });
    expect(css.startsWith(':root{')).toBe(true);
    expect(css).toContain('font-size:110.00%');
    expect(css).toContain('--leather:');
  });
});
