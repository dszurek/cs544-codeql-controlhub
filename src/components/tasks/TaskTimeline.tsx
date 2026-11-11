'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Task } from '@prisma/client';

interface TaskTimelineProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  onBlockersChanged?: () => void;
}

interface BlockerLink {
  taskId: string;
  blockerId: string;
}

function startOf(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysBetween(a: number, b: number) {
  return Math.round((b - a) / 86_400_000);
}

function formatDayLabel(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function TaskTimeline({ tasks, onOpen, onBlockersChanged }: TaskTimelineProps) {
  const [blockers, setBlockers] = useState<BlockerLink[]>([]);
  const [linkMode, setLinkMode] = useState<{ blockerId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/tasks/blockers')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBlockers(data.blockers ?? []);
      })
      .catch(() => { /* fine, just skip rendering lines */ });
    return () => { cancelled = true; };
  }, [tasks]);

  // Only tasks with a due date or start date show on the timeline
  const scheduled = useMemo(
    () =>
      tasks
        .filter((t) => t.dueDate || t.startDate)
        .map((t) => {
          const due = t.dueDate ? startOf(new Date(t.dueDate)) : null;
          const start = t.startDate ? startOf(new Date(t.startDate)) : due;
          return { task: t, start: start!, end: due ?? start! };
        })
        .sort((a, b) => a.start - b.start),
    [tasks],
  );

  async function addBlocker(taskId: string, blockerId: string) {
    if (taskId === blockerId) {
      setLinkMode(null);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/blockers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerId }),
      });
      if (!res.ok) throw new Error('Failed to add blocker');
      setBlockers((prev) => [...prev, { taskId, blockerId }]);
      onBlockersChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add blocker');
    }
    setLinkMode(null);
  }

  async function removeBlocker(taskId: string, blockerId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/blockers?blockerId=${blockerId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to remove blocker');
      setBlockers((prev) =>
        prev.filter((b) => !(b.taskId === taskId && b.blockerId === blockerId)),
      );
      onBlockersChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove blocker');
    }
  }

  if (scheduled.length === 0) {
    return (
      <p style={{ color: 'var(--muted)', padding: '1rem 0' }}>
        No scheduled tasks. Add a due date or start date to see tasks here.
      </p>
    );
  }

  const rangeStart = Math.min(startOf(new Date()), scheduled[0].start);
  const rangeEnd = scheduled.reduce((acc, s) => Math.max(acc, s.end), rangeStart);
  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd) + 1, 7);
  const pxPerDay = 56;
  const rowHeight = 34;
  const rowGap = 4;
  const headerHeight = 28;
  const chartWidth = totalDays * pxPerDay;
  const chartHeight = scheduled.length * (rowHeight + rowGap);

  const days = Array.from({ length: totalDays }, (_, i) => rangeStart + i * 86_400_000);

  const today = startOf(new Date());
  const todayOffset = daysBetween(rangeStart, today) * pxPerDay;

  const rowIndex = new Map(scheduled.map((s, i) => [s.task.id, i]));

  function getBarCoords(taskId: string): { x: number; y: number; w: number } | null {
    const idx = rowIndex.get(taskId);
    if (idx === undefined) return null;
    const s = scheduled[idx];
    const offsetDays = daysBetween(rangeStart, s.start);
    const durationDays = Math.max(daysBetween(s.start, s.end) + 1, 1);
    return {
      x: offsetDays * pxPerDay,
      y: idx * (rowHeight + rowGap) + (rowHeight - 4) / 2,
      w: durationDays * pxPerDay - 8,
    };
  }

  const visibleBlockers = blockers.filter(
    (b) => rowIndex.has(b.taskId) && rowIndex.has(b.blockerId),
  );

  const blockerByTask = new Map<string, Set<string>>();
  for (const b of visibleBlockers) {
    if (!blockerByTask.has(b.taskId)) blockerByTask.set(b.taskId, new Set());
    blockerByTask.get(b.taskId)!.add(b.blockerId);
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        border: '1px solid rgba(216, 204, 192,0.1)',
        borderRadius: '6px',
        background: 'rgba(42, 47, 53, 0.30)',
      }}
    >
      <div style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
        {linkMode ? (
          <>
            <span style={{ color: 'var(--leather-light)' }}>
              Click a task to mark it blocked by the selected one.
            </span>
            <button
              onClick={() => setLinkMode(null)}
              style={{
                background: 'none',
                border: '1px solid rgba(216, 204, 192,0.2)',
                color: 'var(--muted)',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '0.6875rem',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <span>Right-click a bar to set it as a blocker.</span>
        )}
        {error && <span style={{ color: '#dc3545' }}>{error}</span>}
      </div>

      <div style={{ position: 'relative', width: chartWidth, padding: '0 0 0.5rem' }}>
        {/* Day labels */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(216, 204, 192,0.08)',
            marginBottom: '0.5rem',
            height: headerHeight,
          }}
        >
          {days.map((d, i) => (
            <div
              key={d}
              style={{
                width: pxPerDay,
                fontSize: '0.6875rem',
                color: d === today ? 'var(--leather-light)' : 'var(--muted)',
                textAlign: 'center',
                padding: '0.25rem 0',
                borderLeft: i === 0 ? 'none' : '1px solid rgba(216, 204, 192,0.05)',
              }}
            >
              {formatDayLabel(d)}
            </div>
          ))}
        </div>

        {/* Today marker */}
        {today >= rangeStart && today <= rangeEnd && (
          <div
            style={{
              position: 'absolute',
              top: headerHeight,
              bottom: 0,
              left: todayOffset,
              width: 2,
              background: 'rgba(220,53,69,0.5)',
              pointerEvents: 'none',
            }}
            aria-label="Today"
          />
        )}

        {/* Rows */}
        <div style={{ position: 'relative' }}>
          {scheduled.map(({ task, start, end }, idx) => {
            const offsetDays = daysBetween(rangeStart, start);
            const durationDays = Math.max(daysBetween(start, end) + 1, 1);
            const left = offsetDays * pxPerDay;
            const width = durationDays * pxPerDay - 8;

            const taskBlockers = blockerByTask.get(task.id) ?? new Set();
            const activeBlockers = [...taskBlockers].filter((id) => {
              const b = tasks.find((t) => t.id === id);
              return b && b.status !== 'completed' && b.status !== 'cancelled';
            });
            const isBlocked = activeBlockers.length > 0;
            const isOverdue = task.status === 'pending' && task.dueDate && new Date(task.dueDate).getTime() < today;

            const barColor =
              task.status === 'completed'
                ? 'rgba(40,167,69,0.35)'
                : isBlocked
                  ? 'rgba(220,53,69,0.4)'
                  : isOverdue
                    ? 'rgba(220,53,69,0.35)'
                    : task.priority === 1
                      ? 'rgba(220,53,69,0.35)'
                      : task.priority === 2
                        ? 'rgba(255,140,0,0.35)'
                        : 'rgba(176, 122, 79,0.35)';

            return (
              <div
                key={task.id}
                style={{ position: 'relative', height: rowHeight, marginBottom: rowGap }}
              >
                <button
                  onClick={() => {
                    if (linkMode) {
                      void addBlocker(task.id, linkMode.blockerId);
                    } else {
                      onOpen(task.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setLinkMode({ blockerId: task.id });
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left,
                    width,
                    height: rowHeight - 4,
                    background: barColor,
                    border: linkMode?.blockerId === task.id
                      ? '2px solid var(--leather-light)'
                      : isBlocked
                        ? '1px solid rgba(220,53,69,0.6)'
                        : '1px solid rgba(216, 204, 192,0.15)',
                    borderRadius: 4,
                    padding: '0 0.5rem',
                    color: 'var(--beige-light)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={
                    linkMode
                      ? 'Click to mark as blocked by selected task'
                      : isBlocked
                        ? `Blocked by ${activeBlockers.length}`
                        : 'Right-click to use as blocker'
                  }
                >
                  {isBlocked && '⛔ '}
                  {task.title}
                  {task.courseId ? ` · ${task.courseId}` : ''}
                </button>
                <span style={{ display: 'none' }}>{idx}</span>
              </div>
            );
          })}

          {/* Dependency arrows */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: chartWidth,
              height: chartHeight,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <marker
                id="tl-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="rgba(220,53,69,0.7)" />
              </marker>
            </defs>
            {visibleBlockers.map((b) => {
              const from = getBarCoords(b.blockerId);
              const to = getBarCoords(b.taskId);
              if (!from || !to) return null;
              const x1 = from.x + from.w;
              const y1 = from.y;
              const x2 = to.x;
              const y2 = to.y;
              const mx = (x1 + x2) / 2;
              return (
                <g key={`${b.taskId}__${b.blockerId}`}>
                  <path
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    stroke="rgba(220,53,69,0.7)"
                    strokeWidth={1.5}
                    fill="none"
                    markerEnd="url(#tl-arrow)"
                  />
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r={6}
                    fill="rgba(30,30,30,0.85)"
                    stroke="rgba(220,53,69,0.5)"
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={() => removeBlocker(b.taskId, b.blockerId)}
                  >
                    <title>Click to remove dependency</title>
                  </circle>
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 3}
                    fontSize={9}
                    textAnchor="middle"
                    fill="var(--beige-light)"
                    style={{ pointerEvents: 'none' }}
                  >
                    ×
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
