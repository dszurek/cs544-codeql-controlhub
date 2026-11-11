import { prisma } from '@/lib/db';
import { JOB_REGISTRY, isJobType, createSignal, type JobType } from './registry';

/** Exponential backoff between retries: 2m, 4m, 8m… capped at 30m. */
export function nextBackoffMs(attempts: number): number {
  return Math.min(2 ** Math.max(attempts, 1) * 60_000, 30 * 60_000);
}

export interface EnqueueOptions {
  /** Skip if an identical-type job is already queued (default true). */
  dedupe?: boolean;
  scheduledFor?: Date;
}

export async function enqueueJob(
  type: JobType,
  payload?: unknown,
  opts: EnqueueOptions = {},
): Promise<{ id: string; deduped: boolean }> {
  if (opts.dedupe !== false) {
    const existing = await prisma.aiJob.findFirst({
      where: { type, status: 'queued' },
      select: { id: true },
    });
    if (existing) return { id: existing.id, deduped: true };
  }
  const job = await prisma.aiJob.create({
    data: {
      type,
      payload: payload === undefined ? null : JSON.stringify(payload),
      scheduledFor: opts.scheduledFor ?? new Date(),
    },
  });
  return { id: job.id, deduped: false };
}

// Concurrency 1: one claude process at a time on the Pi.
let running = false;

export async function processQueue(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const job = await claimNext();
      if (!job) break;
      await runJob(job);
    }
  } finally {
    running = false;
  }
}

/** Jobs stuck in `running` after a crash/restart go back to the queue. */
export async function recoverStaleJobs(): Promise<void> {
  await prisma.aiJob.updateMany({
    where: { status: 'running' },
    data: { status: 'queued', error: 'recovered after restart' },
  });
}

async function claimNext() {
  const candidate = await prisma.aiJob.findFirst({
    where: { status: 'queued', scheduledFor: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!candidate) return null;

  // Atomic claim — if another tick raced us, count is 0 and we move on.
  const claimed = await prisma.aiJob.updateMany({
    where: { id: candidate.id, status: 'queued' },
    data: { status: 'running', startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;
  return prisma.aiJob.findUnique({ where: { id: candidate.id } });
}

async function runJob(job: NonNullable<Awaited<ReturnType<typeof claimNext>>>): Promise<void> {
  if (!isJobType(job.type)) {
    await prisma.aiJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: `unknown job type: ${job.type}`, finishedAt: new Date() },
    });
    return;
  }
  const def = JOB_REGISTRY[job.type];

  try {
    const payload = job.payload ? JSON.parse(job.payload) : null;
    const outcome = await def.execute(payload);
    await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: 'succeeded',
        result: JSON.stringify(outcome.result ?? null),
        error: null,
        finishedAt: new Date(),
      },
    });
    if (outcome.signal) await createSignal(job.id, outcome.signal);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cortex] ${job.type} attempt ${job.attempts} failed:`, message);
    if (job.attempts < job.maxAttempts) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          error: message,
          scheduledFor: new Date(Date.now() + nextBackoffMs(job.attempts)),
        },
      });
    } else {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: message, finishedAt: new Date() },
      });
    }
  }
}
