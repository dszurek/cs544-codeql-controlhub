'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseQuickAdd, type Project } from './parseQuickAdd';

export interface PaletteCommand {
  id: string;
  label: string;
  hint: string;
  keywords?: string;
}

export const NAV_COMMANDS: PaletteCommand[] = [
  { id: 'nav:/', label: 'Go to Today', hint: 'surface', keywords: 'home dashboard' },
  { id: 'nav:/plan', label: 'Go to Plan', hint: 'surface', keywords: 'tasks backlog calendar someday' },
  { id: 'nav:/streams', label: 'Go to Streams', hint: 'surface', keywords: 'mail email inbox' },
  { id: 'nav:/body', label: 'Go to Body', hint: 'surface', keywords: 'health sleep readiness' },
  { id: 'nav:/spaces', label: 'Go to Spaces', hint: 'surface', keywords: 'home assistant lights scenes' },
  { id: 'nav:/library', label: 'Go to Library', hint: 'surface', keywords: 'notes grades archive' },
  { id: 'nav:/settings', label: 'Go to Settings', hint: 'surface', keywords: 'config integrations' },
];

/** Substring match on label + keywords; empty query returns everything. */
export function matchCommands(query: string, commands: PaletteCommand[]): PaletteCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q),
  );
}

interface Row {
  key: string;
  label: React.ReactNode;
  hint: string;
  run: () => void | Promise<void>;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setInput('');
    setSelected(0);
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => { /* projects are optional for parsing */ });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const parsed = useMemo(
    () => (input.trim() ? parseQuickAdd(input, projects) : null),
    [input, projects],
  );

  const createTask = useCallback(async () => {
    if (!parsed || !parsed.title || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: parsed.title,
        type: parsed.type,
        priority: parsed.priority,
      };
      if (parsed.dueDate) body.dueDate = parsed.dueDate.toISOString();
      if (parsed.dueTime) body.dueTime = parsed.dueTime;
      if (parsed.projectId) body.projectId = parsed.projectId;
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create task');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
      setSubmitting(false);
    }
  }, [parsed, submitting, close]);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    if (parsed?.title) {
      list.push({
        key: 'create-task',
        label: (
          <>
            Create task: <strong>{parsed.title}</strong>
          </>
        ),
        hint: 'enter',
        run: createTask,
      });
    }
    for (const cmd of matchCommands(input, NAV_COMMANDS)) {
      list.push({
        key: cmd.id,
        label: cmd.label,
        hint: cmd.hint,
        run: () => {
          router.push(cmd.id.slice('nav:'.length));
          close();
        },
      });
    }
    if (input.trim()) {
      list.push({
        key: 'ask-claude',
        label: (
          <>
            Ask Claude: <em>&ldquo;{input.trim()}&rdquo;</em>
          </>
        ),
        hint: 'copilot',
        run: () => {
          window.dispatchEvent(
            new CustomEvent('controlhub:open-copilot', { detail: { prompt: input.trim() } }),
          );
          close();
        },
      });
    }
    return list;
  }, [parsed, input, createTask, router, close]);

  const clampedSelected = Math.min(selected, Math.max(rows.length - 1, 0));

  if (!open) return null;

  return (
    <>
      <div className="palette-backdrop" onClick={close} />
      <div role="dialog" aria-label="Command palette" className="palette glass-float">
        <div className="palette-input-row">
          <span className="palette-glyph" aria-hidden>⌘</span>
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={input}
            placeholder="Type a command, or a task like “lab report p2 friday 3pm”…"
            onChange={(e) => {
              setInput(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                close();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, rows.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === 'Enter' && rows[clampedSelected]) {
                e.preventDefault();
                void rows[clampedSelected].run();
              }
            }}
          />
        </div>

        {parsed?.title && (
          <div className="palette-chips">
            <span className={`palette-chip chip-prio`}>P{parsed.priority}</span>
            {parsed.type !== 'general' && <span className="palette-chip">@{parsed.type}</span>}
            {parsed.projectLabel && <span className="palette-chip">#{parsed.projectLabel}</span>}
            {parsed.dueDate && (
              <span className="palette-chip chip-due">
                due {parsed.dueDate.toLocaleDateString()}
                {parsed.dueTime ? ` ${parsed.dueTime}` : ''}
              </span>
            )}
            {error && <span style={{ color: 'var(--glow-urgent)' }}>{error}</span>}
          </div>
        )}

        <div className="palette-results" role="listbox">
          {rows.map((row, i) => (
            <button
              key={row.key}
              role="option"
              aria-selected={i === clampedSelected}
              className={`palette-item${i === clampedSelected ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => void row.run()}
            >
              <span>{row.label}</span>
              <span className="palette-item-hint">{row.hint}</span>
            </button>
          ))}
        </div>

        <div className="palette-footer">
          <span>↑↓ navigate</span>
          <span>⏎ run</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>p1–p4 · @type · #project · natural dates</span>
        </div>
      </div>
    </>
  );
}
