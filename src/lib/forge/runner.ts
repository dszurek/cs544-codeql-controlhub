import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { invokeClaudeCode } from '@/lib/chat/claudeCode';
import { createWorktree, stageAndCapture, mergeBranch, cleanupWorktree, runCmd } from './git';
import { canApply, canDiscard, parseForgeSummary } from './guards';

const FORGE_SYSTEM_PROMPT = `You are the ControlHub Forge — an agent that modifies ControlHub's own
codebase on request. You are working inside an isolated git worktree on a throwaway branch; your
changes will be reviewed by the user before anything is merged. Rules:
- Make the smallest change that fully satisfies the request. Match existing conventions and the
  design system in src/app/globals.css.
- Edit source only. Do NOT run destructive commands, do NOT push, do NOT touch git history, do NOT
  modify .env files or delete data.
- Prefer adding tests when you add logic.
- End your response with EXACTLY one \`\`\`json block:
  {"summary": "<what you changed and why, markdown>", "filesChanged": ["path", ...]}`;

const FORGE_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'];

/**
 * Environment for the Forge subprocess. The agent runs with Bash, so it can
 * read its own env — strip the login secrets so they never leak into a diff,
 * a log, or a prompt-injected exfiltration. DATABASE_URL stays (it points at
 * the worktree's throwaway dev.db copy via the relative path), as do PATH/HOME
 * that claude and npx need.
 */
function forgeEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.AUTH_PASSWORD;
  delete env.AUTH_SECRET;
  return env;
}
const CLAUDE_TIMEOUT_MS = 12 * 60_000;
const TEST_TIMEOUT_MS = 6 * 60_000;

let running = false;

export async function enqueueForge(request: string): Promise<{ id: string }> {
  const job = await prisma.forgeJob.create({ data: { request: request.trim() } });
  return { id: job.id };
}

export async function isForgeEnabled(): Promise<boolean> {
  return (await getSetting('forge_enabled')) === 'on';
}

/**
 * A ForgeJob left in `running` by a crash/restart can never progress: the queue
 * only claims `queued`, apply needs `review`, and discard allows only
 * review/failed. Move it to `failed` (so the UI can dismiss it) and clean up its
 * leaked worktree + branch. Not auto-retried — re-running an interrupted
 * self-modification unattended is not safe; the user re-submits.
 */
export async function recoverStaleForgeJobs(): Promise<void> {
  const stale = await prisma.forgeJob.findMany({ where: { status: 'running' } });
  for (const job of stale) {
    if (job.branch && job.worktreePath) {
      await cleanupWorktree(process.cwd(), job.worktreePath, job.branch).catch(() => {});
    }
    await prisma.forgeJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: 'interrupted by restart', finishedAt: new Date(), worktreePath: null },
    });
  }
}

/** Process the next queued Forge job. Concurrency 1 — one self-mod at a time. */
export async function processForgeQueue(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const job = await prisma.forgeJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
      });
      if (!job) break;
      await runForgeJob(job.id, job.request);
    }
  } finally {
    running = false;
  }
}

async function runForgeJob(id: string, request: string): Promise<void> {
  const claimed = await prisma.forgeJob.updateMany({
    where: { id, status: 'queued' },
    data: { status: 'running' },
  });
  if (claimed.count === 0) return;

  const repoRoot = process.cwd();
  let worktreePath: string | undefined;
  let branch: string | undefined;

  try {
    if (!(await isForgeEnabled())) throw new Error('Forge is disabled (enable it in the Forge tab)');

    const wt = await createWorktree(repoRoot, id);
    worktreePath = wt.path;
    branch = wt.branch;
    await prisma.forgeJob.update({ where: { id }, data: { branch, worktreePath } });

    // Claude edits files in the isolated worktree.
    const res = await invokeClaudeCode({
      message: `Change request for the ControlHub codebase:\n\n${request}`,
      cwd: wt.path,
      systemPrompt: FORGE_SYSTEM_PROMPT,
      allowedTools: FORGE_TOOLS,
      timeoutMs: CLAUDE_TIMEOUT_MS,
      lowPriority: true,
      env: forgeEnv(),
    });
    const parsed = parseForgeSummary(res.text);

    // Capture diff + commit on the branch.
    const { diff, files } = await stageAndCapture(wt.path, `forge: ${request.slice(0, 60)}`);
    if (files.length === 0) {
      throw new Error('No changes were made to the codebase');
    }

    // Best-effort test run in the worktree (shares node_modules via symlink).
    const test = await runCmd('npx', ['vitest', 'run'], { cwd: wt.path, timeoutMs: TEST_TIMEOUT_MS });
    const testRan = test.code !== null;
    const testOutput = `${test.stdout}\n${test.stderr}`.slice(-12_000);

    await prisma.forgeJob.update({
      where: { id },
      data: {
        status: 'review',
        summary: parsed?.summary ?? res.text.slice(0, 2000),
        filesChanged: JSON.stringify(parsed?.filesChanged?.length ? parsed.filesChanged : files),
        diff,
        testOutput,
        testsPassed: testRan ? test.ok : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[forge] job ${id} failed:`, message);
    // Clean up the worktree so a failed run leaves nothing behind.
    if (worktreePath && branch) await cleanupWorktree(repoRoot, worktreePath, branch).catch(() => {});
    await prisma.forgeJob.update({
      where: { id },
      data: { status: 'failed', error: message, finishedAt: new Date(), worktreePath: null },
    });
  }
}

export async function applyForge(id: string, force: boolean): Promise<{ ok: boolean; error?: string }> {
  const job = await prisma.forgeJob.findUnique({ where: { id } });
  if (!job) return { ok: false, error: 'not found' };

  const decision = canApply(job, force);
  if (!decision.allowed) return { ok: false, error: decision.reason };
  if (!job.branch || !job.worktreePath) return { ok: false, error: 'worktree is gone; re-run the request' };

  const merge = await mergeBranch(process.cwd(), job.branch);
  if (!merge.ok) {
    return { ok: false, error: `merge failed: ${merge.stderr || merge.stdout}` };
  }
  await cleanupWorktree(process.cwd(), job.worktreePath, job.branch);
  await prisma.forgeJob.update({
    where: { id },
    data: { status: 'applied', finishedAt: new Date(), worktreePath: null },
  });
  return { ok: true };
}

export async function discardForge(id: string): Promise<{ ok: boolean; error?: string }> {
  const job = await prisma.forgeJob.findUnique({ where: { id } });
  if (!job) return { ok: false, error: 'not found' };
  if (!canDiscard(job)) return { ok: false, error: `cannot discard a "${job.status}" job` };

  if (job.branch && job.worktreePath) {
    await cleanupWorktree(process.cwd(), job.worktreePath, job.branch).catch(() => {});
  }
  await prisma.forgeJob.update({
    where: { id },
    data: { status: 'discarded', finishedAt: new Date(), worktreePath: null },
  });
  return { ok: true };
}
