import { getSetting, setSetting } from './settings';
import { coerceAppearance, DEFAULT_APPEARANCE, type Appearance } from './appearance';

export async function getAppearance(): Promise<Appearance> {
  const raw = await getSetting('appearance');
  if (!raw) return { ...DEFAULT_APPEARANCE };
  try {
    return coerceAppearance(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export async function setAppearance(a: Appearance): Promise<void> {
  await setSetting('appearance', JSON.stringify(coerceAppearance(a)));
}
