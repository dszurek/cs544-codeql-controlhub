'use client';

import { useState } from 'react';
import type { Task } from '@prisma/client';
import { TaskItem } from './TaskItem';
import type { GroupBy } from '@/hooks/useTaskFilters';

interface TaskListProps {
  tasks: Task[];
  projects: Array<{ id: string; name: string }>;
  groupBy: GroupBy;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onChangePriority: (id: string, priority: number) => void;
  onEdit?: (id: string) => void;
  onAddSubtask?: (parentId: string) => void;
  onBulkComplete?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkChangePriority?: (ids: string[], priority: number) => void;
}

function getPriorityLabel(p: number): string {
  if (p === 1) return 'P1 – Urgent';
  if (p === 2) return 'P2 – High';
  if (p === 3) return 'P3 – Medium';
  return 'P4 – Low';
}

function getDueDateGroup(dueDate: Date | null): string {
  if (!dueDate) return 'No date';
  const date = typeof dueDate === 'string'
    ? (dueDate as string).includes('T') ? new Date(dueDate) : new Date((dueDate as string) + 'T12:00:00')
    : dueDate;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (dateStart < todayStart) return 'Overdue';
  if (dateStart.getTime() === todayStart.getTime()) return 'Today';
  if (dateStart < weekEnd) return 'This week';
  return 'Later';
}

const DUE_DATE_GROUP_ORDER = ['Overdue', 'Today', 'This week', 'Later', 'No date'];

interface TaskGroup {
  heading: string;
  tasks: Task[];
}

function groupTasks(
  tasks: Task[],
  groupBy: GroupBy,
  projects: Array<{ id: string; name: string }>,
): TaskGroup[] {
  if (groupBy === 'none') {
    return [{ heading: '', tasks }];
  }

  if (groupBy === 'priority') {
    const groups: TaskGroup[] = [];
    for (const p of [1, 2, 3, 4]) {
      const grouped = tasks.filter((t) => t.priority === p);
      if (grouped.length > 0) {
        groups.push({ heading: getPriorityLabel(p), tasks: grouped });
      }
    }
    return groups;
  }

  if (groupBy === 'project') {
    const map = new Map<string | null, Task[]>();
    for (const task of tasks) {
      const key = task.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    const groups: TaskGroup[] = [];
    map.forEach((groupedTasks, projectId) => {
      const project = projects.find((p) => p.id === projectId);
      groups.push({
        heading: project ? project.name : 'No project',
        tasks: groupedTasks,
      });
    });
    groups.sort((a, b) => {
      if (a.heading === 'No project') return 1;
      if (b.heading === 'No project') return -1;
      return a.heading.localeCompare(b.heading);
    });
    return groups;
  }

  if (groupBy === 'dueDate') {
    const map = new Map<string, Task[]>();
    for (const label of DUE_DATE_GROUP_ORDER) {
      map.set(label, []);
    }
    for (const task of tasks) {
      const label = getDueDateGroup(task.dueDate);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(task);
    }
    const groups: TaskGroup[] = [];
    for (const label of DUE_DATE_GROUP_ORDER) {
      const groupedTasks = map.get(label) ?? [];
      if (groupedTasks.length > 0) {
        groups.push({ heading: label, tasks: groupedTasks });
      }
    }
    return groups;
  }

  return [{ heading: '', tasks }];
}

function BulkActionBar({
  selectedIds,
  onComplete,
  onDelete,
  onChangePriority,
}: {
  selectedIds: string[];
  onComplete?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onChangePriority?: (ids: string[], priority: number) => void;
}) {
  const [bulkPriority, setBulkPriority] = useState('');
  const count = selectedIds.length;

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '4rem',
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'var(--leather)',
    borderTop: '1px solid rgba(216, 204, 192,0.2)',
    zIndex: 51,
    fontSize: '0.8125rem',
    color: 'var(--beige-light)',
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    background: 'rgba(216, 204, 192,0.1)',
    border: '1px solid rgba(216, 204, 192,0.3)',
    color: 'var(--beige-light)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
  };

  return (
    <div style={barStyle}>
      <span>{count} selected</span>
      {onComplete && (
        <button style={btnStyle} onClick={() => onComplete(selectedIds)}>
          Complete
        </button>
      )}
      {onDelete && (
        <button style={{ ...btnStyle, color: '#dc3545' }} onClick={() => onDelete(selectedIds)}>
          Delete
        </button>
      )}
      {onChangePriority && (
        <select
          aria-label="Bulk priority"
          style={{ ...btnStyle, cursor: 'pointer' }}
          value={bulkPriority}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              onChangePriority(selectedIds, Number(val));
              setBulkPriority('');
            }
          }}
        >
          <option value="" disabled>
            Priority
          </option>
          <option value="1">P1</option>
          <option value="2">P2</option>
          <option value="3">P3</option>
          <option value="4">P4</option>
        </select>
      )}
    </div>
  );
}

export function TaskList({
  tasks,
  projects,
  groupBy,
  onComplete,
  onDelete,
  onChangePriority,
  onEdit,
  onAddSubtask,
  onBulkComplete,
  onBulkDelete,
  onBulkChangePriority,
}: TaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (tasks.length === 0) {
    return <p>No tasks</p>;
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const visibleIds = new Set(tasks.map((t) => t.id));
  const childrenMap = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.parentId && visibleIds.has(t.parentId)) {
      const arr = childrenMap.get(t.parentId) ?? [];
      arr.push(t);
      childrenMap.set(t.parentId, arr);
    }
  }
  const rootTasks = tasks.filter((t) => !t.parentId || !visibleIds.has(t.parentId));
  const groups = groupTasks(rootTasks, groupBy, projects);
  const selectedArray = Array.from(selectedIds);
  const showBulkBar = selectedIds.size > 0;

  const rowWrapStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const groupHeadingStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--leather-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0.75rem 0 0.25rem',
    borderBottom: '1px solid rgba(216, 204, 192,0.15)',
    marginBottom: '0.25rem',
  };

  function renderTask(task: Task, depth: number): React.ReactNode {
    const children = childrenMap.get(task.id) ?? [];
    return (
      <div key={task.id}>
        <div style={{ ...rowWrapStyle, paddingLeft: depth * 20 }}>
          <input
            type="checkbox"
            aria-label={`Select task ${task.title}`}
            checked={selectedIds.has(task.id)}
            onChange={() => toggleSelect(task.id)}
            style={{ flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <TaskItem
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onChangePriority={onChangePriority}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
            />
          </div>
        </div>
        {children.map((child) => renderTask(child, depth + 1))}
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.heading}>
          {groupBy !== 'none' && group.heading && (
            <div style={groupHeadingStyle}>{group.heading}</div>
          )}
          {group.tasks.map((task) => renderTask(task, 0))}
        </div>
      ))}

      {showBulkBar && (
        <BulkActionBar
          selectedIds={selectedArray}
          onComplete={onBulkComplete ? () => { onBulkComplete([...selectedIds]); setSelectedIds(new Set()); } : undefined}
          onDelete={onBulkDelete ? () => { onBulkDelete([...selectedIds]); setSelectedIds(new Set()); } : undefined}
          onChangePriority={onBulkChangePriority ? (ids, p) => { onBulkChangePriority(ids, p); setSelectedIds(new Set()); } : undefined}
        />
      )}
    </div>
  );
}
