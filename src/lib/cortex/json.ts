/**
 * Extracts the structured JSON block a Cortex job asks Claude to emit.
 * Tolerates a ```json fence anywhere in the response, or a bare object.
 * Pure module — testable without spawning anything.
 */
export function extractJsonBlock(text: string): unknown | null {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenceMatch?.[1] ?? text;
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function asGlow(v: unknown): 'track' | 'attend' | 'urgent' {
  return v === 'attend' || v === 'urgent' ? v : 'track';
}
