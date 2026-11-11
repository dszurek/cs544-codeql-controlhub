import { describe, it, expect } from 'vitest';
import { matchCommands, NAV_COMMANDS } from '@/components/quickadd/CommandPalette';
import { parseQuickAdd } from '@/components/quickadd/parseQuickAdd';

describe('matchCommands', () => {
  it('returns all commands for an empty query', () => {
    expect(matchCommands('', NAV_COMMANDS)).toHaveLength(NAV_COMMANDS.length);
  });

  it('matches by label substring, case-insensitive', () => {
    const hits = matchCommands('LIBRARY', NAV_COMMANDS);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('nav:/library');
  });

  it('matches by keywords', () => {
    const hits = matchCommands('email', NAV_COMMANDS);
    expect(hits.map((h) => h.id)).toContain('nav:/streams');
  });

  it('returns empty for no match', () => {
    expect(matchCommands('zzzznope', NAV_COMMANDS)).toHaveLength(0);
  });
});

describe('parseQuickAdd (module extraction)', () => {
  it('parses priority, type, and natural dates', () => {
    const parsed = parseQuickAdd('submit lab report p2 @homework friday 3pm', []);
    expect(parsed.title).toBe('submit lab report');
    expect(parsed.priority).toBe(2);
    expect(parsed.type).toBe('homework');
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.dueTime).toBe('15:00');
  });

  it('resolves #project slugs against the project list', () => {
    const parsed = parseQuickAdd('buy milk #groceries', [{ id: 'p1', name: 'Groceries' }]);
    expect(parsed.projectId).toBe('p1');
    expect(parsed.title).toBe('buy milk');
  });

  it('defaults to priority 4 and general type', () => {
    const parsed = parseQuickAdd('just a title', []);
    expect(parsed.priority).toBe(4);
    expect(parsed.type).toBe('general');
    expect(parsed.dueDate).toBeUndefined();
  });
});
