'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as chrono from 'chrono-node';

interface AddTaskSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (task: {
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
  }) => void;
  projects: Array<{ id: string; name: string }>;
  parentId?: string | null;
  parentTitle?: string | null;
}

function formatParsedDate(date: Date): string {
  // Check if the date has a meaningful time (not midnight)
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hasTime = hours !== 0 || minutes !== 0;

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (hasTime) {
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Parsed: ${datePart} at ${timePart}`;
  }

  return `Parsed: ${datePart}`;
}

function extractDueTime(date: Date): string | undefined {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return undefined;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.15)',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--beige-light)',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '0.875rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--leather-light)',
  marginBottom: '0.25rem',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '1rem',
};

export function AddTaskSheet({
  open,
  onClose,
  onAdd,
  projects,
  parentId,
  parentTitle,
}: AddTaskSheetProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState(4);
  const [dueDateText, setDueDateText] = useState('');
  const [parsedDate, setParsedDate] = useState<Date | null | undefined>(undefined);
  const [startDateText, setStartDateText] = useState('');
  const [parsedStartDate, setParsedStartDate] = useState<Date | null | undefined>(undefined);
  const [estimateText, setEstimateText] = useState('');
  const [courseId, setCourseId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [titleError, setTitleError] = useState('');

  const resetForm = useCallback(() => {
    setTitle('');
    setNotes('');
    setType('general');
    setPriority(4);
    setDueDateText('');
    setParsedDate(undefined);
    setStartDateText('');
    setParsedStartDate(undefined);
    setEstimateText('');
    setCourseId('');
    setProjectId('');
    setTitleError('');
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]); // stable — ref handles identity

  const titleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) titleInputRef.current?.focus();
  }, [open]);

  function handleDueDateChange(value: string) {
    setDueDateText(value);
    if (!value.trim()) {
      setParsedDate(undefined);
      return;
    }
    const result = chrono.parseDate(value, new Date());
    setParsedDate(result);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');

    const task: Parameters<typeof onAdd>[0] = {
      title: title.trim(),
      type,
      priority,
    };

    if (notes.trim()) task.notes = notes.trim();
    if (parsedDate) {
      task.dueDate = parsedDate;
      const time = extractDueTime(parsedDate);
      if (time) task.dueTime = time;
    }
    if (parsedStartDate) task.startDate = parsedStartDate;
    const estimateNum = Number.parseInt(estimateText, 10);
    if (Number.isFinite(estimateNum) && estimateNum > 0) task.estimatedMinutes = estimateNum;
    if (type === 'homework' && courseId.trim()) task.courseId = courseId.trim();
    if (projectId) task.projectId = projectId;
    if (parentId) task.parentId = parentId;

    onAdd(task);
    resetForm();
    onClose();
  }

  function handleCancel() {
    resetForm();
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        data-testid="sheet-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
        }}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-heading"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#111',
          borderRadius: '12px 12px 0 0',
          padding: '1.5rem',
          zIndex: 201,
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <h2
          id="add-task-heading"
          style={{
            fontFamily: 'var(--font-playfair)',
            color: 'var(--beige-light)',
            marginBottom: parentTitle ? '0.25rem' : '1rem',
            marginTop: 0,
          }}
        >
          {parentId ? 'Add Subtask' : 'Add Task'}
        </h2>
        {parentTitle && (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: '0 0 1rem' }}>
            under <span style={{ color: 'var(--beige-light)' }}>{parentTitle}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-title">
              Title
            </label>
            <input
              ref={titleInputRef}
              id="add-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              style={inputStyle}
            />
            {titleError && (
              <p
                style={{
                  color: '#dc3545',
                  fontSize: '0.75rem',
                  margin: '0.25rem 0 0',
                }}
              >
                {titleError}
              </p>
            )}
          </div>

          {/* Notes */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-notes">
              Notes
            </label>
            <textarea
              id="add-task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Type */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-type">
              Type
            </label>
            <select
              id="add-task-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={inputStyle}
            >
              <option value="general">General</option>
              <option value="assignment">Assignment</option>
              <option value="homework">Homework</option>
              <option value="meeting">Meeting</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>

          {/* Priority */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-priority">
              Priority
            </label>
            <select
              id="add-task-priority"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={inputStyle}
            >
              <option value={1}>1 – Urgent</option>
              <option value={2}>2 – High</option>
              <option value={3}>3 – Medium</option>
              <option value={4}>4 – Low</option>
            </select>
          </div>

          {/* Due date */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-due">
              Due Date
            </label>
            <input
              id="add-task-due"
              type="text"
              value={dueDateText}
              onChange={(e) => handleDueDateChange(e.target.value)}
              placeholder='e.g. "tomorrow", "friday 3pm", "Apr 20"'
              style={inputStyle}
            />
            {dueDateText.trim() && parsedDate !== undefined && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: parsedDate ? 'var(--forest-light)' : '#dc3545',
                  marginTop: '0.25rem',
                  margin: '0.25rem 0 0',
                }}
              >
                {parsedDate ? formatParsedDate(parsedDate) : 'Could not parse date'}
              </p>
            )}
          </div>

          {/* Homework-only: course */}
          {type === 'homework' && (
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="add-task-course">
                Course
              </label>
              <input
                id="add-task-course"
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder='e.g. "CS 3500"'
                style={inputStyle}
              />
            </div>
          )}

          {/* Start date (for timeline) */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-start">
              Start Date (optional, for timeline)
            </label>
            <input
              id="add-task-start"
              type="text"
              value={startDateText}
              onChange={(e) => {
                setStartDateText(e.target.value);
                if (!e.target.value.trim()) {
                  setParsedStartDate(undefined);
                  return;
                }
                setParsedStartDate(chrono.parseDate(e.target.value, new Date()));
              }}
              placeholder='e.g. "monday", "next week"'
              style={inputStyle}
            />
            {startDateText.trim() && parsedStartDate !== undefined && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: parsedStartDate ? 'var(--forest-light)' : '#dc3545',
                  marginTop: '0.25rem',
                  margin: '0.25rem 0 0',
                }}
              >
                {parsedStartDate ? formatParsedDate(parsedStartDate) : 'Could not parse date'}
              </p>
            )}
          </div>

          {/* Estimated minutes */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-estimate">
              Estimate (minutes)
            </label>
            <input
              id="add-task-estimate"
              type="number"
              min="1"
              value={estimateText}
              onChange={(e) => setEstimateText(e.target.value)}
              placeholder="e.g. 60"
              style={inputStyle}
            />
          </div>

          {/* Project */}
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="add-task-project">
              Project
            </label>
            <select
              id="add-task-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={inputStyle}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              style={{
                background: 'rgba(176, 122, 79,0.3)',
                border: '1px solid rgba(176, 122, 79,0.5)',
                color: 'var(--leather-light)',
                borderRadius: '6px',
                padding: '0.625rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Add Task
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: 'none',
                border: '1px solid rgba(216, 204, 192,0.2)',
                color: 'var(--muted)',
                borderRadius: '6px',
                padding: '0.625rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
