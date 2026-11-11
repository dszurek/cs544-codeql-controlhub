'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { parseQuickAdd, type Project } from '@/components/quickadd/parseQuickAdd';
import { bucketTasks, formatDue, isOverdue, type HorizonTask } from './horizon';

const COLUMNS = [
  { key: 'now' as const, title: 'Now', hint: 'overdue + today' },
  { key: 'next' as const, title: 'Next', hint: '7 days out' },
  { key: 'later' as const, title: 'Later', hint: 'the long game' },
];

export function HorizonView() {
  const [tasks, setTasks] = useState<HorizonTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/tasks?view=all')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load tasks'))))
      .then((data) => {
        setTasks(data.tasks ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load tasks");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => { /* optional */ });
  }, [load]);

  const buckets = useMemo(() => bucketTasks(tasks), [tasks]);

  async function quickAdd() {
    const parsed = parseQuickAdd(input, projects);
    if (!parsed.title) return;
    const body: Record<string, unknown> = {
      title: parsed.title,
      type: parsed.type,
      priority: parsed.priority,
    };
    if (parsed.dueDate) body.dueDate = parsed.dueDate.toISOString();
    if (parsed.dueTime) body.dueTime = parsed.dueTime;
    if (parsed.projectId) body.projectId = parsed.projectId;
    setInput('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError("Couldn't create task");
    }
  }

  function complete(task: HorizonTask) {
    // play the strike animation, then drop the task from local state
    setCompleting((prev) => new Set(prev).add(task.id));
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }).catch(() => { /* reconciled on next load */ });
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }, 480);
  }

  if (loading) {
    return (
      <div className="hz-board">
        {COLUMNS.map((c) => (
          <div key={c.key} className="hz-col glass-pane">
            <span className="skeleton" style={{ height: 12, width: '50%', marginBottom: 12 }} />
            <span className="skeleton" style={{ height: 56, marginBottom: 8 }} />
            <span className="skeleton" style={{ height: 56 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="hz-add glass-pane reveal">
        <span className="palette-glyph" aria-hidden>+</span>
        <input
          value={input}
          placeholder="Add a task… “study for physics exam p1 next tuesday #school”"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              void quickAdd();
            }
          }}
        />
        <span className="palette-item-hint">⏎ add</span>
      </div>

      {error && (
        <p style={{ color: 'var(--glow-urgent)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}

      <div className="hz-board">
        {COLUMNS.map((col, ci) => {
          const list = buckets[col.key];
          return (
            <section
              key={col.key}
              className={`hz-col glass-pane reveal ${col.key}`}
              style={{ ['--reveal-i' as string]: ci + 1 }}
              aria-label={`${col.title} — ${col.hint}`}
            >
              <div className="hz-col-head">
                <span className="hz-col-title">{col.title}</span>
                <span className="hz-col-count">{list.length}</span>
              </div>
              <div className="hz-list">
                {list.length === 0 ? (
                  <div className="hz-empty">— clear —</div>
                ) : (
                  list.map((t, i) => (
                    <div
                      key={t.id}
                      className={`hz-card hover-raise reveal p${t.priority}${completing.has(t.id) ? ' done' : ''}`}
                      style={{ ['--reveal-i' as string]: i }}
                    >
                      <input
                        type="checkbox"
                        className="hz-check"
                        aria-label={`Complete ${t.title}`}
                        checked={completing.has(t.id)}
                        onChange={() => complete(t)}
                      />
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/tasks/${t.id}`}
                          className="hz-card-title"
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {t.title}
                        </Link>
                        <div className="hz-card-meta">
                          <span className={isOverdue(t) ? 'overdue' : undefined}>
                            {isOverdue(t) ? '▲ ' : ''}{formatDue(t)}
                          </span>
                          <span>P{t.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
