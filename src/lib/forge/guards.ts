/**
 * Pure Forge guard logic — the safety rules that decide what can be
 * applied, kept separate from the impure git/process layer so they're
 * unit-tested.
 */
import { extractJsonBlock } from '@/lib/cortex/json';

export interface ForgeJobLike {
  status: string;
  testsPassed: boolean | null;
}

export interface ApplyDecision {
  allowed: boolean;
  reason?: string;
  /** True when tests didn't pass but the user may override with force. */
  needsForce?: boolean;
}

/**
 * Apply rules:
 *  - only a job awaiting review can be applied
 *  - tests definitively failing blocks apply unless force=true
 *  - tests that couldn't run (null) are allowed but flagged
 */
export function canApply(job: ForgeJobLike, force: boolean): ApplyDecision {
  if (job.status !== 'review') {
    return { allowed: false, reason: `Job is "${job.status}", not awaiting review` };
  }
  if (job.testsPassed === false && !force) {
    return { allowed: false, needsForce: true, reason: 'Tests failed — confirm to apply anyway' };
  }
  return { allowed: true, needsForce: job.testsPassed === null };
}

export function canDiscard(job: ForgeJobLike): boolean {
  return job.status === 'review' || job.status === 'failed';
}

/** Parse the JSON summary the Forge prompt asks Claude to emit. */
export function parseForgeSummary(text: string): { summary: string; filesChanged: string[] } | null {
  const parsed = extractJsonBlock(text) as Record<string, unknown> | null;
  if (!parsed) return null;
  const summary = typeof parsed.summary === 'string' ? parsed.summary : null;
  if (!summary) return null;
  const filesChanged = Array.isArray(parsed.filesChanged)
    ? parsed.filesChanged.filter((f: unknown): f is string => typeof f === 'string')
    : [];
  return { summary, filesChanged };
}
