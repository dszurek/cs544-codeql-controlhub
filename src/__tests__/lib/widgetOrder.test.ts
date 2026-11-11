import { describe, it, expect, vi } from 'vitest';

// dashboardWidgets pulls in settings → db at import time; stub it so the
// pure helpers can be tested without a database.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { mergeOrder, sortByOrder, WIDGET_IDS } from '@/lib/dashboardWidgets';

describe('mergeOrder', () => {
  it('returns the full widget list for empty/invalid input', () => {
    expect(mergeOrder(null)).toEqual([...WIDGET_IDS]);
    expect(mergeOrder('nope')).toEqual([...WIDGET_IDS]);
  });

  it('keeps saved order then appends widgets the save predates', () => {
    const merged = mergeOrder(['mail', 'clock']);
    expect(merged.slice(0, 2)).toEqual(['mail', 'clock']);
    // every canonical id is present exactly once
    expect(new Set(merged)).toEqual(new Set(WIDGET_IDS));
    expect(merged.length).toBe(WIDGET_IDS.length);
  });

  it('drops unknown and duplicate ids', () => {
    const merged = mergeOrder(['mail', 'mail', 'bogus', 'clock']);
    expect(merged.filter((id) => id === 'mail')).toHaveLength(1);
    expect(merged).not.toContain('bogus');
  });
});

describe('sortByOrder', () => {
  it('sorts items by the given order, unknowns last', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(sortByOrder(items, ['c', 'a', 'b']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
    expect(sortByOrder(items, ['b']).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the input array', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    sortByOrder(items, ['b', 'a']);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
