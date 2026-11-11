import { spawn } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setPriority } from 'node:os';
import { CHAT_SYSTEM_PROMPT } from './systemPrompt';

export const ALLOWED_TOOLS = [
  'Read',
  'Edit',
  'Write',
  'Bash',
  'Grep',
  'Glob',
  'mcp__controlhub__list_tasks',
  'mcp__controlhub__create_task',
  'mcp__controlhub__update_task',
  'mcp__controlhub__complete_task',
  'mcp__controlhub__list_emails',
  'mcp__controlhub__mark_email_read',
  'mcp__controlhub__list_events',
  'mcp__controlhub__link_email_to_event',
  'mcp__controlhub__list_email_rules',
  'mcp__controlhub__add_email_rule',
  'mcp__controlhub__remove_email_rule',
  'mcp__controlhub__get_unread_summary',
];

export interface ClaudeCodeInvokeOptions {
  message: string;
  sessionUuid?: string; // If provided, resume this session; otherwise generate new
  model?: string;
  cwd?: string;
  /** Scope the tool surface per invocation (Cortex jobs). Defaults to the chat set. */
  allowedTools?: string[];
  /** Replaces the chat system prompt for new sessions (Cortex jobs). */
  systemPrompt?: string;
  /** Kill the invocation after this long. */
  timeoutMs?: number;
  /** Run niced so background jobs never starve the kiosk UI. */
  lowPriority?: boolean;
  /** Override the child process environment (Forge scrubs secrets). Defaults to process.env. */
  env?: NodeJS.ProcessEnv;
}

export interface ClaudeCodeResult {
  sessionUuid: string;
  text: string;
  raw: unknown;
}

/**
 * Invoke Claude Code CLI in non-interactive mode with MCP + full auto-permissions.
 * Returns the assistant's response text and the session UUID for continuation.
 */
export async function invokeClaudeCode(
  opts: ClaudeCodeInvokeOptions,
): Promise<ClaudeCodeResult> {
  const isNew = !opts.sessionUuid;
  const sessionUuid = opts.sessionUuid ?? randomUUID();
  const cwd = opts.cwd ?? process.cwd();
  const mcpConfigPath = path.join(cwd, 'scripts', 'mcp-server', 'mcp.json');

  const args: string[] = [
    '-p',
    opts.message,
    '--model',
    opts.model ?? 'sonnet',
    '--output-format',
    'json',
    '--dangerously-skip-permissions',
    '--allowed-tools',
    (opts.allowedTools ?? ALLOWED_TOOLS).join(','),
    '--mcp-config',
    mcpConfigPath,
    '--strict-mcp-config',
  ];

  if (isNew) {
    args.push('--session-id', sessionUuid);
    args.push('--append-system-prompt', opts.systemPrompt ?? CHAT_SYSTEM_PROMPT);
  } else {
    args.push('--resume', sessionUuid);
  }

  return new Promise<ClaudeCodeResult>((resolve, reject) => {
    const child = spawn('claude', args, { cwd, env: opts.env ?? process.env });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    if (opts.lowPriority && child.pid) {
      try {
        setPriority(child.pid, 15);
      } catch { /* best-effort nice */ }
    }

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
      reject(err);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`claude invocation timed out after ${opts.timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr || stdout}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        // The output-format=json result shape: { type: 'result', result: '<text>', ... }
        const responseText =
          typeof parsed.result === 'string'
            ? parsed.result
            : typeof parsed.text === 'string'
              ? parsed.text
              : stdout;
        resolve({ sessionUuid, text: responseText, raw: parsed });
      } catch {
        resolve({ sessionUuid, text: stdout, raw: stdout });
      }
    });
  });
}
