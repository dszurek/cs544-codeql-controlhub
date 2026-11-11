'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task } from '@prisma/client';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { TaskFilters } from './TaskFilters';
import { TaskList } from './TaskList';
import { AddTaskSheet } from './AddTaskSheet';
import { TaskTimeline } from './TaskTimeline';
import { NewProjectInline } from './NewProjectInline';
import { useToast } from '@/components/ui/Toast';

type View = 'today' | 'upcoming' | 'priority' | 'all' | 'byProject' | 'timeline';

const TABS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'priority', label: 'Priority' },
  { id: 'all', label: 'All' },
  { id: 'byProject', label: 'By Project' },
  { id: 'timeline', label: 'Timeline' },
];

export function TasksView() {
  const [activeView, setActiveView] = useState<View>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetParent, setSheetParent] = useState<{ id: string; title: string } | null>(null);

  const router = useRouter();
  const filtersHook = useTaskFilters();

  function handleTabClick(view: View) {
    setActiveView(view);
    if (view === 'byProject') {
      filtersHook.setGroupBy('project');
    } else if (filtersHook.filters.groupBy === 'project') {
      filtersHook.setGroupBy('none');
    }
  }

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch projects once
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => { /* projects unavailable — tasks still work without grouping */ });
  }, []);

  // Fetch tasks when view, filters, or refreshKey change
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const qp: Record<string, string> = {
      ...filtersHook.toQueryParams(),
    };
    if (activeView === 'today' || activeView === 'upcoming' || activeView === 'priority') {
      qp.view = activeView;
    }
    const params = new URLSearchParams(qp);
    fetch(`/api/tasks?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Failed to load tasks.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // filtersHook.toQueryParams reads from filtersHook.filters synchronously; filters is in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, refreshKey, filtersHook.filters]);

  async function handleAdd(taskData: {
    title: string;
    notes?: string;
    description?: string;
    type: string;
    priority: number;
    dueDate?: Date;
    dueTime?: string;
    startDate?: Date;
    estimatedMinutes?: number;
    courseId?: string;
    projectId?: string;
    parentId?: string;
  }) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error('Request failed');
      refresh();
      setSheetOpen(false);
      setSheetParent(null);
    } catch {
      setError('Failed to add task.');
    }
  }

  function handleAddSubtask(parentId: string) {
    const parent = tasks.find((t) => t.id === parentId);
    setSheetParent({ id: parentId, title: parent?.title ?? 'parent task' });
    setSheetOpen(true);
  }

  async function handleComplete(id: string) {
    const task = tasks.find((t) => t.id === id);
    const prevStatus = task?.status ?? 'pending';
    const nextStatus = prevStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Request failed');
      refresh();
      if (nextStatus === 'completed') {
        toast.success('Task completed', {
          action: {
            label: 'Undo',
            handler: async () => {
              await fetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: prevStatus }),
              });
              refresh();
            },
          },
        });
      }
    } catch {
      setError('Failed to update task.');
    }
  }

  async function handleDelete(id: string) {
    const task = tasks.find((t) => t.id === id);
    const snapshot = task ? { ...task } : null;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      refresh();
      if (snapshot) {
        toast.info(`Deleted "${snapshot.title}"`, {
          action: {
            label: 'Undo',
            handler: async () => {
              const { id: _id, createdAt: _c, completedAt: _cp, ...rest } = snapshot;
              await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rest),
              });
              refresh();
            },
          },
        });
      }
    } catch {
      setError('Failed to delete task.');
    }
  }

  async function handleChangePriority(id: string, priority: number) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) throw new Error('Request failed');
      refresh();
    } catch {
      setError('Failed to update priority.');
    }
  }

  async function handleBulkComplete(ids: string[]) {
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) setError(`${failed} task(s) failed to complete.`);
    refresh();
  }

  async function handleBulkDelete(ids: string[]) {
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/tasks/${id}`, { method: 'DELETE' }))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) setError(`${failed} task(s) failed to delete.`);
    refresh();
  }

  async function handleBulkChangePriority(ids: string[], priority: number) {
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) setError(`${failed} task(s) failed to update.`);
    refresh();
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-playfair)',
          marginBottom: '1rem',
          color: 'var(--beige-light)',
        }}
      >
        Tasks
      </h1>

      {/* View tabs */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(216, 204, 192,0.08)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--leather-light)' : '2px solid transparent',
                color: isActive ? 'var(--leather-light)' : 'var(--muted)',
                padding: '0.5rem 0',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ color: '#dc3545', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}

      {/* Filters */}
      <TaskFilters
        filters={filtersHook.filters}
        onSetSortAndOrder={filtersHook.setSortAndOrder}
        onSetFilterType={filtersHook.setFilterType}
        onSetFilterPriority={filtersHook.setFilterPriority}
        onSetFilterStatus={filtersHook.setFilterStatus}
        onSetOverdueOnly={filtersHook.setOverdueOnly}
        onSetGroupBy={filtersHook.setGroupBy}
        onReset={filtersHook.reset}
      />

      {activeView === 'byProject' && (
        <NewProjectInline
          onCreated={(p) => {
            setProjects((prev) => [...prev, p]);
            refresh();
          }}
        />
      )}

      {/* Task list or timeline */}
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : activeView === 'timeline' ? (
        <TaskTimeline tasks={tasks} onOpen={(id) => router.push(`/tasks/${id}`)} />
      ) : (
        <TaskList
          tasks={tasks}
          projects={projects}
          groupBy={filtersHook.filters.groupBy}
          onComplete={handleComplete}
          onDelete={handleDelete}
          onChangePriority={handleChangePriority}
          onEdit={(id) => router.push(`/tasks/${id}`)}
          onAddSubtask={handleAddSubtask}
          onBulkComplete={handleBulkComplete}
          onBulkDelete={handleBulkDelete}
          onBulkChangePriority={handleBulkChangePriority}
        />
      )}

      {/* Floating + button */}
      <button
        aria-label="Add task"
        onClick={() => {
          setSheetParent(null);
          setSheetOpen(true);
        }}
        style={{
          position: 'fixed',
          bottom: '6rem',
          right: '1.5rem',
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: 'rgba(176, 122, 79,0.8)',
          border: '1px solid rgba(176, 122, 79,0.6)',
          color: 'var(--beige-light)',
          fontSize: '1.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        +
      </button>

      {/* Add task sheet */}
      <AddTaskSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSheetParent(null);
        }}
        onAdd={handleAdd}
        projects={projects}
        parentId={sheetParent?.id ?? null}
        parentTitle={sheetParent?.title ?? null}
      />
    </div>
  );
}
