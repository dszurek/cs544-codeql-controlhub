'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task } from '@prisma/client';

interface TaskItemProps {
  task: Pick<Task, 'id' | 'title' | 'notes' | 'type' | 'priority' | 'status' | 'dueDate' | 'dueTime' | 'projectId' | 'aiPriority'>;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onChangePriority: (id: string, priority: number) => void;
  onEdit?: (id: string) => void;
  onAddSubtask?: (parentId: string) => void;
}

function getPriorityStyle(priority: number): {
  background: string;
  border: string;
  color: string;
  label: string;
} {
  switch (priority) {
    case 1:
      return {
        background: 'rgba(220, 53, 69, 0.2)',
        border: 'rgba(220, 53, 69, 0.5)',
        color: '#dc3545',
        label: 'P1',
      };
    case 2:
      return {
        background: 'rgba(255, 140, 0, 0.2)',
        border: 'rgba(255, 140, 0, 0.5)',
        color: '#ff8c00',
        label: 'P2',
      };
    case 3:
      return {
        background: 'rgba(199, 154, 107, 0.2)',
        border: 'rgba(199, 154, 107, 0.5)',
        color: 'var(--leather-light)',
        label: 'P3',
      };
    case 4:
    default:
      return {
        background: 'rgba(93, 93, 93, 0.2)',
        border: 'rgba(93, 93, 93, 0.4)',
        color: 'var(--muted)',
        label: 'P4',
      };
  }
}

function formatDueDate(dueDate: Date | string): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  // Parse date-only strings (e.g. "2026-04-14") as local time, not UTC midnight
  const date =
    typeof dueDate === 'string'
      ? dueDate.includes('T')
        ? new Date(dueDate)
        : new Date(dueDate + 'T12:00:00')
      : dueDate;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateStart.getTime() === todayStart.getTime()) {
    return { text: 'Today', isOverdue: false, isToday: true };
  }

  const isOverdue = dateStart < todayStart;
  const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { text, isOverdue, isToday: false };
}

function getTypeTag(type: string): string | null {
  if (type === 'assignment') return 'ASSIGN';
  if (type === 'meeting') return 'MTG';
  return null;
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 12px',
  background: 'none',
  border: 'none',
  color: 'var(--beige-light)',
  fontSize: '0.8125rem',
  textAlign: 'left',
  cursor: 'pointer',
};

export function TaskItem({
  task,
  onComplete,
  onDelete,
  onChangePriority,
  onEdit,
  onAddSubtask,
}: TaskItemProps) {
  const { id, title, type, priority, status, dueDate, aiPriority } = task;
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isCompleted = status === 'completed';
  const priorityStyle = getPriorityStyle(priority);
  const dueDateInfo = dueDate ? formatDueDate(dueDate) : null;
  const typeTag = getTypeTag(type);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen((prev) => !prev);
  }

  function handleMenuItemClick(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={handleContextMenu}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        padding: '0.875rem 0.25rem',
        borderBottom: '1px solid rgba(216, 204, 192,0.1)',
        gap: '0.625rem',
      }}
    >
      {/* Priority badge */}
      <span
        style={{
          fontSize: '0.625rem',
          padding: '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${priorityStyle.border}`,
          background: priorityStyle.background,
          color: priorityStyle.color,
          letterSpacing: '0.06em',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {priorityStyle.label}
      </span>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onComplete(id)}
        aria-label="Mark complete"
        style={{ flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
      />

      {/* Title */}
      <span
        onClick={() => onEdit?.(id)}
        style={{
          flex: 1,
          fontSize: '0.9375rem',
          lineHeight: 1.4,
          color: 'var(--beige-light)',
          textDecoration: isCompleted ? 'line-through' : 'none',
          opacity: isCompleted ? 0.5 : 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          cursor: onEdit ? 'pointer' : 'default',
        }}
      >
        {aiPriority && (
          <span
            aria-label="Flagged by briefing"
            title="Flagged by the briefing agent"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--leather-light)',
              flexShrink: 0,
              opacity: 0.7,
            }}
          />
        )}
        {title}
      </span>

      {/* Due date */}
      {dueDateInfo && (
        <span
          style={{
            fontSize: '0.75rem',
            color: dueDateInfo.isOverdue ? '#dc3545' : 'var(--muted)',
            flexShrink: 0,
          }}
        >
          {dueDateInfo.text}
        </span>
      )}

      {/* Type tag */}
      {typeTag && (
        <span
          style={{
            fontSize: '0.5625rem',
            color: 'var(--leather-light)',
            letterSpacing: '0.08em',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {typeTag}
        </span>
      )}

      {/* Context menu */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 100,
            background: '#1a1a1a',
            border: '1px solid rgba(216, 204, 192,0.15)',
            borderRadius: '6px',
            minWidth: '140px',
            padding: '4px 0',
          }}
        >
          {onEdit && (
            <button
              onClick={() => handleMenuItemClick(() => onEdit(id))}
              style={menuItemStyle}
            >
              Edit
            </button>
          )}
          {onAddSubtask && (
            <button
              onClick={() => handleMenuItemClick(() => onAddSubtask(id))}
              style={menuItemStyle}
            >
              Add subtask
            </button>
          )}
          {([1, 2, 3, 4] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleMenuItemClick(() => onChangePriority(id, p))}
              style={menuItemStyle}
            >
              {p === 1 ? 'P1 – Urgent' : p === 2 ? 'P2 – High' : p === 3 ? 'P3 – Medium' : 'P4 – Low'}
            </button>
          ))}
          <button
            onClick={() => handleMenuItemClick(() => onDelete(id))}
            style={{ ...menuItemStyle, color: '#dc3545' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
