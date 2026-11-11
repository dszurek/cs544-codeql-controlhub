import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    aiJob: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    signal: { create: vi.fn() },
  },
}));

import { prisma } from '@/lib/db';
import { extractJsonBlock, asGlow, asStringArray } from '@/lib/cortex/json';
import { nextBackoffMs, enqueueJob } from '@/lib/cortex/runner';
import {
  validateWeeklyReview,
  validateHealthInsight,
  validateEmailTriage,
} from '@/lib/cortex/registry';

describe('extractJsonBlock', () => {
  it('extracts a fenced json block', () => {
    const text = 'Here is my analysis.\n```json\n{"summary": "ok"}\n```';
    expect(extractJsonBlock(text)).toEqual({ summary: 'ok' });
  });

  it('extracts a bare object as fallback', () => {
    expect(extractJsonBlock('blah {"a": 1} trailing')).toEqual({ a: 1 });
  });

  it('returns null when nothing parses', () => {
    expect(extractJsonBlock('no json here')).toBeNull();
    expect(extractJsonBlock('```json\nnot valid\n```')).toBeNull();
  });
});

describe('json helpers', () => {
  it('asGlow defaults to track', () => {
    expect(asGlow('urgent')).toBe('urgent');
    expect(asGlow('attend')).toBe('attend');
    expect(asGlow('purple')).toBe('track');
    expect(asGlow(undefined)).toBe('track');
  });

  it('asStringArray filters non-strings', () => {
    expect(asStringArray(['a', 1, 'b', null])).toEqual(['a', 'b']);
    expect(asStringArray('nope')).toEqual([]);
  });
});

describe('nextBackoffMs', () => {
  it('doubles per attempt and caps at 30 minutes', () => {
    expect(nextBackoffMs(1)).toBe(2 * 60_000);
    expect(nextBackoffMs(2)).toBe(4 * 60_000);
    expect(nextBackoffMs(10)).toBe(30 * 60_000);
  });
});

describe('enqueueJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dedupes against an already-queued job of the same type', async () => {
    vi.mocked(prisma.aiJob.findFirst).mockResolvedValue({ id: 'existing' } as never);
    const r = await enqueueJob('briefing');
    expect(r).toEqual({ id: 'existing', deduped: true });
    expect(prisma.aiJob.create).not.toHaveBeenCalled();
  });

  it('creates a job when none is queued', async () => {
    vi.mocked(prisma.aiJob.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.aiJob.create).mockResolvedValue({ id: 'new-job' } as never);
    const r = await enqueueJob('health_insight', { focus: 'sleep' });
    expect(r).toEqual({ id: 'new-job', deduped: false });
    expect(prisma.aiJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'health_insight',
        payload: JSON.stringify({ focus: 'sleep' }),
      }),
    });
  });

  it('skips dedupe when asked', async () => {
    vi.mocked(prisma.aiJob.create).mockResolvedValue({ id: 'forced' } as never);
    const r = await enqueueJob('briefing', undefined, { dedupe: false });
    expect(r.deduped).toBe(false);
    expect(prisma.aiJob.findFirst).not.toHaveBeenCalled();
  });
});

describe('weekly review validation', () => {
  it('accepts a valid payload', () => {
    const v = validateWeeklyReview({ summary: 'good week', wins: ['shipped'], adjustments: ['sleep more'] });
    expect(v).toEqual({ summary: 'good week', wins: ['shipped'], adjustments: ['sleep more'] });
  });

  it('rejects a missing summary and tolerates missing arrays', () => {
    expect(validateWeeklyReview({ wins: [] })).toBeNull();
    expect(validateWeeklyReview({ summary: 's' })).toEqual({ summary: 's', wins: [], adjustments: [] });
  });
});

describe('email triage validation', () => {
  it('keeps valid classifications and drops invalid tiers/ids', () => {
    const v = validateEmailTriage({
      classifications: [
        { id: 'a', tier: 'urgent', summary: 'pay this' },
        { id: 'b', tier: 'banana', summary: 'nope' },
        { tier: 'reply', summary: 'no id' },
      ],
      ruleSuggestions: [
        { pattern: 'newsletter@', action: 'mute', reason: 'ignored 12x' },
        { pattern: '', action: 'mute', reason: 'empty pattern' },
        { pattern: 'x@y.com', action: 'delete', reason: 'bad action' },
      ],
    });
    expect(v?.classifications).toEqual([{ id: 'a', tier: 'urgent', summary: 'pay this' }]);
    expect(v?.ruleSuggestions).toEqual([
      { pattern: 'newsletter@', action: 'mute', reason: 'ignored 12x' },
    ]);
  });

  it('rejects payloads without a classifications array', () => {
    expect(validateEmailTriage({})).toBeNull();
    expect(validateEmailTriage(null)).toBeNull();
  });
});

describe('health insight validation', () => {
  it('accepts a valid payload and defaults glow', () => {
    const v = validateHealthInsight({ headline: 'HRV rebounding', insight: 'Up 12% over baseline.' });
    expect(v).toMatchObject({ headline: 'HRV rebounding', glow: 'track', suggestion: '' });
  });

  it('rejects missing fields', () => {
    expect(validateHealthInsight({ headline: 'only' })).toBeNull();
    expect(validateHealthInsight(null)).toBeNull();
  });
});
