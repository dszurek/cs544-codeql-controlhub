'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, CalendarEvent, Email, TaskComment } from '@prisma/client';
import { SnoozeMenu } from '@/components/ui/SnoozeMenu';
import { TaskRepoSection } from './TaskRepoSection';

interface TaskDetailViewProps {
  taskId: string;
}

interface DetailResponse {
  task: Task;
  blockedBy: Task[];
  blocks: Task[];
  subtasks: Task[];
  comments: TaskComment[];
  emails: Email[];
  events: CalendarEvent[];
}

const sectionStyle: React.CSSProperties = {
  marginTop: '1.5rem',
  paddingTop: '1rem',
  borderTop: '1px solid rgba(216, 204, 192,0.1)',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--leather-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.5rem',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(42, 47, 53, 0.55)',
  border: '1px solid rgba(216, 204, 192,0.15)',
  borderRadius: '6px',
  padding: '0.5rem 0.75rem',
  color: 'var(--beige-light)',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
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

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState('');
  const [descDirty, setDescDirty] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [blockerPick, setBlockerPick] = useState('');
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState<number>(4);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [dueTimeDraft, setDueTimeDraft] = useState('');
  const [typeDraft, setTypeDraft] = useState('general');
  const [estimatedMinutesDraft, setEstimatedMinutesDraft] = useState('');
  const [blockStartDraft, setBlockStartDraft] = useState('');
  const [blockEndDraft, setBlockEndDraft] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Task not found' : 'Failed to load task');
        return;
      }
      const json = (await res.json()) as DetailResponse;
      setData(json);
      setDescription(json.task.description ?? '');
      setDescDirty(false);
      setError(null);
    } catch {
      setError('Failed to load task');
    }
  }, [taskId]);

  useEffect(() => {
    load();
    fetch('/api/tasks?view=all')
      .then((r) => r.json())
      .then((j) => setAllTasks(j.tasks ?? []))
      .catch(() => {});
  }, [load]);

  const availableBlockers = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.id !== taskId &&
          !data?.blockedBy.some((b) => b.id === t.id) &&
          t.status !== 'completed',
      ),
    [allTasks, data, taskId],
  );

  async function patchTask(body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? 'Update failed');
      return false;
    }
    await load();
    return true;
  }

  async function saveDescription() {
    const ok = await patchTask({ description: description || null });
    if (ok) setDescDirty(false);
  }

  function startEditing() {
    if (!data) return;
    const t = data.task;
    setTitleDraft(t.title);
    setNotesDraft(t.notes ?? '');
    setPriorityDraft(t.priority);
    setDueDateDraft(
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
    );
    setDueTimeDraft(t.dueTime ?? '');
    setTypeDraft(t.type);
    setEstimatedMinutesDraft(
      t.estimatedMinutes != null ? String(t.estimatedMinutes) : '',
    );
    setEditing(true);
  }

  async function saveEdits() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setError('Title cannot be empty');
      return;
    }
    const body: Record<string, unknown> = {
      title: trimmed,
      notes: notesDraft.trim() || null,
      priority: priorityDraft,
      type: typeDraft,
      dueDate: dueDateDraft ? new Date(dueDateDraft + 'T12:00:00') : null,
      dueTime: dueTimeDraft || null,
      estimatedMinutes: estimatedMinutesDraft
        ? Number(estimatedMinutesDraft)
        : null,
    };
    const ok = await patchTask(body);
    if (ok) setEditing(false);
  }

  async function toggleComplete() {
    if (!data) return;
    const newStatus = data.task.status === 'completed' ? 'pending' : 'completed';
    await patchTask({ status: newStatus });
  }

  async function addBlocker() {
    if (!blockerPick) return;
    const res = await fetch(`/api/tasks/${taskId}/blockers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockerId: blockerPick }),
    });
    if (res.ok) {
      setBlockerPick('');
      await load();
    }
  }

  async function removeBlocker(blockerId: string) {
    await fetch(`/api/tasks/${taskId}/blockers?blockerId=${blockerId}`, {
      method: 'DELETE',
    });
    await load();
  }

  async function addComment() {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment('');
      await load();
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
    await load();
  }

  async function addSubtask() {
    const title = prompt('Subtask title?');
    if (!title) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parentId: taskId }),
    });
    await load();
  }

  if (error) {
    return (
      <div style={{ padding: '1rem' }}>
        <p style={{ color: '#dc3545' }}>{error}</p>
        <button style={buttonStyle} onClick={() => router.push('/tasks')}>
          ← Back to tasks
        </button>
      </div>
    );
  }

  if (!data) {
    return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  }

  const { task, blockedBy, blocks, subtasks, comments, emails, events } = data;
  const activeBlockers = blockedBy.filter(
    (b) => b.status !== 'completed' && b.status !== 'cancelled',
  );
  const isBlocked = activeBlockers.length > 0;

  return (
    <div style={{ maxWidth: 760 }}>
      <button
        onClick={() => router.push('/tasks')}
        style={{ ...buttonStyle, background: 'transparent', marginBottom: '1rem' }}
      >
        ← Back
      </button>

      {editing ? (
        <div style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Title"
            style={{ ...inputStyle, fontSize: '1rem' }}
          />
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Notes"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={priorityDraft}
              onChange={(e) => setPriorityDraft(Number(e.target.value))}
              style={{ ...inputStyle, flex: '0 1 120px' }}
            >
              <option value={1}>P1 – Urgent</option>
              <option value={2}>P2 – High</option>
              <option value={3}>P3 – Medium</option>
              <option value={4}>P4 – Low</option>
            </select>
            <select
              value={typeDraft}
              onChange={(e) => setTypeDraft(e.target.value)}
              style={{ ...inputStyle, flex: '0 1 140px' }}
            >
              <option value="general">General</option>
              <option value="assignment">Assignment</option>
              <option value="homework">Homework</option>
              <option value="meeting">Meeting</option>
              <option value="shopping">Shopping</option>
            </select>
            <input
              type="date"
              value={dueDateDraft}
              onChange={(e) => setDueDateDraft(e.target.value)}
              style={{ ...inputStyle, flex: '0 1 160px' }}
            />
            <input
              type="time"
              value={dueTimeDraft}
              onChange={(e) => setDueTimeDraft(e.target.value)}
              style={{ ...inputStyle, flex: '0 1 120px' }}
            />
            <input
              type="number"
              min={0}
              value={estimatedMinutesDraft}
              onChange={(e) => setEstimatedMinutesDraft(e.target.value)}
              placeholder="Est. min"
              style={{ ...inputStyle, flex: '0 1 110px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveEdits} style={buttonStyle}>
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{ ...buttonStyle, background: 'transparent' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-playfair)',
                color: 'var(--beige-light)',
                fontSize: '1.5rem',
                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                opacity: task.status === 'completed' ? 0.6 : 1,
                margin: 0,
              }}
            >
              {task.title}
            </h1>
            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
              <SnoozeMenu
                entityType="task"
                entityId={task.id}
                currentUntil={task.snoozedUntil ? String(task.snoozedUntil) : null}
                onChange={load}
              />
              <button onClick={startEditing} style={{ ...buttonStyle, fontSize: '0.6875rem' }}>
                Edit
              </button>
            </div>
          </div>

          {task.notes && (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
              {task.notes}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              fontSize: '0.75rem',
              color: 'var(--muted)',
              marginBottom: '0.75rem',
            }}
          >
            <span>Type: {task.type}</span>
            <span>·</span>
            <span>Priority: P{task.priority}</span>
            <span>·</span>
            <span>Due: {formatDate(task.dueDate)}</span>
            {task.dueTime && (
              <>
                <span>·</span>
                <span>{task.dueTime}</span>
              </>
            )}
            {task.startDate && (
              <>
                <span>·</span>
                <span>Start: {formatDate(task.startDate)}</span>
              </>
            )}
            {task.estimatedMinutes != null && (
              <>
                <span>·</span>
                <span>Estimate: {task.estimatedMinutes}m</span>
              </>
            )}
            {task.courseId && (
              <>
                <span>·</span>
                <span>Course: {task.courseId}</span>
              </>
            )}
          </div>
        </>
      )}

      {isBlocked && (
        <p
          style={{
            background: 'rgba(220,53,69,0.15)',
            border: '1px solid rgba(220,53,69,0.4)',
            color: '#f1aeb5',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            fontSize: '0.8125rem',
          }}
        >
          Blocked by {activeBlockers.length} incomplete task
          {activeBlockers.length === 1 ? '' : 's'}.
        </p>
      )}

      <button
        onClick={toggleComplete}
        style={{ ...buttonStyle, marginTop: '0.5rem' }}
        disabled={isBlocked && task.status !== 'completed'}
        title={isBlocked && task.status !== 'completed' ? 'Resolve blockers first' : ''}
      >
        {task.status === 'completed' ? 'Reopen' : 'Mark complete'}
      </button>

      {/* Time block */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Time block</h2>
        {task.blockStart && task.blockEnd ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: 'rgba(93,109,72,0.1)',
              border: '1px solid rgba(93,109,72,0.3)',
              borderRadius: 6,
              fontSize: '0.8125rem',
              color: 'var(--beige-light)',
            }}
          >
            <span>
              {new Date(task.blockStart).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {' → '}
              {new Date(task.blockEnd).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <button
              onClick={() => patchTask({ blockStart: null, blockEnd: null })}
              style={{ ...buttonStyle, fontSize: '0.6875rem', marginLeft: 'auto' }}
            >
              Clear
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', margin: 0 }}>No block scheduled.</p>
        )}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="datetime-local"
            value={blockStartDraft}
            onChange={(e) => setBlockStartDraft(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 220px' }}
          />
          <span style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>→</span>
          <input
            type="datetime-local"
            value={blockEndDraft}
            onChange={(e) => setBlockEndDraft(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 220px' }}
          />
          <button
            style={buttonStyle}
            disabled={!blockStartDraft || !blockEndDraft}
            onClick={async () => {
              if (!blockStartDraft || !blockEndDraft) return;
              const startIso = new Date(blockStartDraft).toISOString();
              const endIso = new Date(blockEndDraft).toISOString();
              if (new Date(endIso) <= new Date(startIso)) {
                setError('Block end must be after start');
                return;
              }
              const ok = await patchTask({ blockStart: startIso, blockEnd: endIso });
              if (ok) {
                setBlockStartDraft('');
                setBlockEndDraft('');
              }
            }}
          >
            Schedule
          </button>
        </div>
      </section>

      {/* Description (markdown-ish, plain textarea for now) */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Description</h2>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDescDirty(true);
          }}
          placeholder="Long-form description (markdown)…"
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
        {descDirty && (
          <button style={{ ...buttonStyle, marginTop: '0.5rem' }} onClick={saveDescription}>
            Save description
          </button>
        )}
      </section>

      {/* Repository + Claude command */}
      <TaskRepoSection
        taskId={task.id}
        taskTitle={task.title}
        taskDescription={task.description ?? null}
      />

      {/* Subtasks */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>
          Subtasks ({subtasks.filter((s) => s.status === 'completed').length}/{subtasks.length})
        </h2>
        {subtasks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>None yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {subtasks.map((st) => (
            <li
              key={st.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0',
              }}
            >
              <input
                type="checkbox"
                checked={st.status === 'completed'}
                onChange={async () => {
                  const newStatus = st.status === 'completed' ? 'pending' : 'completed';
                  await fetch(`/api/tasks/${st.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                  });
                  await load();
                }}
              />
              <button
                onClick={() => router.push(`/tasks/${st.id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--beige-light)',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: st.status === 'completed' ? 'line-through' : 'none',
                }}
              >
                {st.title}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={addSubtask} style={{ ...buttonStyle, marginTop: '0.5rem' }}>
          + Add subtask
        </button>
      </section>

      {/* Blockers */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Blocked by</h2>
        {blockedBy.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No blockers.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {blockedBy.map((b) => (
            <li
              key={b.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.25rem 0',
              }}
            >
              <button
                onClick={() => router.push(`/tasks/${b.id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    b.status === 'completed' ? 'var(--muted)' : 'var(--beige-light)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: b.status === 'completed' ? 'line-through' : 'none',
                }}
              >
                {b.title}
              </button>
              <button
                onClick={() => removeBlocker(b.id)}
                style={{ ...buttonStyle, fontSize: '0.6875rem' }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <select
            aria-label="Add blocker"
            value={blockerPick}
            onChange={(e) => setBlockerPick(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">Select a task…</option>
            {availableBlockers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button onClick={addBlocker} style={buttonStyle} disabled={!blockerPick}>
            Add
          </button>
        </div>
      </section>

      {/* Blocks (reverse) */}
      {blocks.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Blocks</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {blocks.map((b) => (
              <li key={b.id} style={{ padding: '0.25rem 0' }}>
                <button
                  onClick={() => router.push(`/tasks/${b.id}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--beige-light)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {b.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Linked emails */}
      {emails.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Linked emails</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {emails.map((em) => (
              <li
                key={em.id}
                style={{
                  padding: '0.4rem 0.5rem',
                  background: 'rgba(42, 47, 53, 0.40)',
                  border: '1px solid rgba(216, 204, 192,0.08)',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ color: 'var(--beige-light)' }}>{em.subject}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  {em.senderName || em.senderEmail}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Linked events */}
      {events.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>Linked events</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {events.map((ev) => (
              <li
                key={ev.id}
                style={{
                  padding: '0.4rem 0.5rem',
                  background: 'rgba(42, 47, 53, 0.40)',
                  border: '1px solid rgba(216, 204, 192,0.08)',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ color: 'var(--beige-light)' }}>{ev.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                  {formatDate(ev.startAt)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comments */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Comments</h2>
        {comments.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>No comments yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {comments.map((c) => (
            <li
              key={c.id}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(42, 47, 53, 0.40)',
                border: '1px solid rgba(216, 204, 192,0.08)',
                borderRadius: 6,
                marginBottom: 4,
                fontSize: '0.8125rem',
                color: 'var(--beige)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => deleteComment(c.id)}
                  style={{ ...buttonStyle, fontSize: '0.6875rem' }}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newComment.trim()) addComment();
            }}
            placeholder="Add a comment…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addComment} style={buttonStyle} disabled={!newComment.trim()}>
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
