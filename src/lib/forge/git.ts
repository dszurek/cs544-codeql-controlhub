import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';

export interface CmdResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

/** Run a command, capturing output. Never throws — returns ok=false. */
export function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<CmdResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts.cwd ?? process.cwd(), env: process.env });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, opts.timeoutMs)
      : null;
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: stderr + String(err), code: null });
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ ok: !timedOut && code === 0, stdout, stderr: timedOut ? stderr + '\n[timed out]' : stderr, code });
    });
  });
}

const git = (args: string[], cwd: string, timeoutMs = 60_000) => runCmd('git', args, { cwd, timeoutMs });

export interface Worktree {
  branch: string;
  path: string;
}

/**
 * Create an isolated worktree on a fresh branch from current HEAD. The repo's
 * main checkout is never touched.
 *
 * Isolation choices matter here — the Forge agent runs with Bash and
 * --dangerously-skip-permissions:
 *  - node_modules is symlinked (large, read-only in practice).
 *  - dev.db is COPIED, not linked, so a derailed or prompt-injected run that
 *    deletes or truncates it destroys only the throwaway copy, never live data.
 *    Prisma's `file:./dev.db` is relative, so tests in the worktree hit the copy.
 *  - .env.local is deliberately NOT linked, so the login password never sits in
 *    the sandbox as a file. (The runner also scrubs it from the child's env.)
 */
export async function createWorktree(repoRoot: string, id: string): Promise<Worktree> {
  const branch = `forge/${id}`;
  const wtPath = path.join(repoRoot, '.forge', id);
  await fs.mkdir(path.join(repoRoot, '.forge'), { recursive: true });

  const res = await git(['worktree', 'add', '-b', branch, wtPath, 'HEAD'], repoRoot);
  if (!res.ok) throw new Error(`worktree add failed: ${res.stderr || res.stdout}`);

  await symlinkIfMissing(path.join(repoRoot, 'node_modules'), path.join(wtPath, 'node_modules'));
  await copyIfPresent(path.join(repoRoot, 'dev.db'), path.join(wtPath, 'dev.db'));

  return { branch, path: wtPath };
}

async function copyIfPresent(src: string, dest: string): Promise<void> {
  try {
    await fs.access(src);
  } catch {
    return; // nothing to copy
  }
  await fs.copyFile(src, dest).catch(() => {/* best-effort */});
}

async function symlinkIfMissing(target: string, link: string): Promise<void> {
  try {
    await fs.access(target);
  } catch {
    return; // nothing to link
  }
  try {
    await fs.symlink(target, link);
  } catch {
    /* already exists or unsupported — best-effort */
  }
}

/** Stage everything, capture the staged diff (truncated), commit on the branch. */
export async function stageAndCapture(wtPath: string, message: string, maxChars = 80_000): Promise<{
  diff: string;
  files: string[];
}> {
  await git(['add', '-A'], wtPath);
  const nameStatus = await git(['diff', '--cached', '--name-only'], wtPath);
  const files = nameStatus.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  const diffRes = await git(['diff', '--cached'], wtPath);
  let diff = diffRes.stdout;
  if (diff.length > maxChars) diff = diff.slice(0, maxChars) + '\n… [diff truncated]';
  if (files.length > 0) await git(['commit', '-m', message], wtPath);
  return { diff, files };
}

/** Merge the forge branch into the current checkout (the review gate has passed). */
export async function mergeBranch(repoRoot: string, branch: string): Promise<CmdResult> {
  return git(['merge', '--no-ff', '-m', `forge: merge ${branch}`, branch], repoRoot);
}

/** Remove the worktree and delete its branch. */
export async function cleanupWorktree(repoRoot: string, wtPath: string, branch: string): Promise<void> {
  await git(['worktree', 'remove', '--force', wtPath], repoRoot);
  await git(['branch', '-D', branch], repoRoot);
  await fs.rm(wtPath, { recursive: true, force: true }).catch(() => {});
}
