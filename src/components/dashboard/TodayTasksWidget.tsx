'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface Task {
  id: string;
  title: string;
  notes?: string;
  priority: 1 | 2 | 3 | 4;
  status: 'pending' | 'completed';
  dueDate?: string;
  dueTime?: string;
  projectId?: string;
}

function getPriorityStyle(priority: number): { background: string; border: string; color: string; label: string } {
  switch (priority) {
    case 1:
      return { background: 'rgba(220,53,69,0.2)', border: 'rgba(220,53,69,0.5)', color: '#dc3545', label: 'P1' };
    case 2:
      return { background: 'rgba(255,140,0,0.2)', border: 'rgba(255,140,0,0.5)', color: '#ff8c00', label: 'P2' };
    case 3:
      return { background: 'rgba(199, 154, 107,0.2)', border: 'rgba(199, 154, 107,0.5)', color: 'var(--leather-light)', label: 'P3' };
    case 4:
    default:
      return { background: 'rgba(93,93,93,0.2)', border: 'rgba(93,93,93,0.4)', color: 'var(--muted)', label: 'P4' };
  }
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Pending before completed
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }
    // Then by priority ascending (1 = highest)
    return a.priority - b.priority;
  });
}

export function TodayTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/tasks?view=today');
        if (!res.ok) throw new Error('Failed to load tasks');
        const data: { tasks: Task[] } = await res.json();

        if (cancelled) return;
        setTasks(sortTasks(data.tasks));
      } catch {
        if (!cancelled) setError('Couldn\'t load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(task: Task) {
    const newStatus: Task['status'] = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTasks((prev) =>
      sortTasks(prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update task');
    } catch {
      // Revert on error
      setTasks((prev) =>
        sortTasks(prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)))
      );
    }
  }

  return (
    <GlassCard>
      <h2
        style={{
          margin: '0 0 0.75rem 0',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--leather-light)',
        }}
      >
        Due today
      </h2>

      {loading && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>Loading…</p>
      )}

      {!loading && error && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>No tasks due today</p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const priorityStyle = getPriorityStyle(task.priority);

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid rgba(216, 204, 192,0.08)',
                  opacity: isCompleted ? 0.6 : 1,
                }}
              >
                {/* Circular checkbox button */}
                <button
                  onClick={() => handleToggle(task)}
                  aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  style={{
                    flexShrink: 0,
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    border: `2px solid ${isCompleted ? 'var(--leather-light)' : 'rgba(216, 204, 192,0.4)'}`,
                    background: isCompleted ? 'var(--leather-light)' : 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isCompleted && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#050505" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Title */}
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.875rem',
                    color: 'var(--beige-light)',
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.title}
                </span>

                {/* Priority chip */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '0.5625rem',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    border: `1px solid ${priorityStyle.border}`,
                    background: priorityStyle.background,
                    color: priorityStyle.color,
                    letterSpacing: '0.05em',
                  }}
                >
                  {priorityStyle.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
