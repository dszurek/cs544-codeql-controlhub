import { describe, it, expect } from 'vitest';
import { canApply, canDiscard, parseForgeSummary } from '@/lib/forge/guards';

describe('canApply', () => {
  it('allows applying a reviewed job whose tests passed', () => {
    expect(canApply({ status: 'review', testsPassed: true }, false)).toEqual({
      allowed: true,
      needsForce: false,
    });
  });

  it('blocks applying unless the job is awaiting review', () => {
    for (const status of ['queued', 'running', 'applied', 'discarded', 'failed']) {
      expect(canApply({ status, testsPassed: true }, false).allowed).toBe(false);
    }
  });

  it('blocks when tests failed, but allows with force', () => {
    const blocked = canApply({ status: 'review', testsPassed: false }, false);
    expect(blocked.allowed).toBe(false);
    expect(blocked.needsForce).toBe(true);
    expect(canApply({ status: 'review', testsPassed: false }, true).allowed).toBe(true);
  });

  it('allows when tests could not run but flags it', () => {
    expect(canApply({ status: 'review', testsPassed: null }, false)).toEqual({
      allowed: true,
      needsForce: true,
    });
  });
});

describe('canDiscard', () => {
  it('allows discarding review and failed jobs only', () => {
    expect(canDiscard({ status: 'review', testsPassed: null })).toBe(true);
    expect(canDiscard({ status: 'failed', testsPassed: null })).toBe(true);
    expect(canDiscard({ status: 'applied', testsPassed: true })).toBe(false);
    expect(canDiscard({ status: 'running', testsPassed: null })).toBe(false);
  });
});

describe('parseForgeSummary', () => {
  it('extracts a fenced summary + files', () => {
    const text = 'Done.\n```json\n{"summary":"Added a widget","filesChanged":["src/a.tsx","src/b.ts"]}\n```';
    expect(parseForgeSummary(text)).toEqual({
      summary: 'Added a widget',
      filesChanged: ['src/a.tsx', 'src/b.ts'],
    });
  });

  it('tolerates a missing filesChanged array', () => {
    expect(parseForgeSummary('{"summary":"x"}')).toEqual({ summary: 'x', filesChanged: [] });
  });

  it('returns null without a usable summary', () => {
    expect(parseForgeSummary('no json here')).toBeNull();
    expect(parseForgeSummary('{"filesChanged":[]}')).toBeNull();
  });
});
