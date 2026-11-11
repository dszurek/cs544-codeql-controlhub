import { describe, it, expect } from 'vitest';
import { bucketTasks, isOverdue, formatDue, type HorizonTask } from '@/components/plan/horizon';

const NOW = new Date('2026-06-12T10:00:00');

function task(overrides: Partial<HorizonTask>): HorizonTask {
  return { id: Math.random().toString(36).slice(2), title: 't', priority: 3, status: 'pending', ...overrides };
}

describe('bucketTasks', () => {
  it('puts overdue and today-due tasks in Now', () => {
    const overdue = task({ dueDate: '2026-06-10T00:00:00' });
    const today = task({ dueDate: '2026-06-12T18:00:00' });
    const b = bucketTasks([overdue, today], NOW);
    expect(b.now).toHaveLength(2);
    expect(b.next).toHaveLength(0);
  });

  it('puts tasks due within 7 days in Next, beyond in Later', () => {
    const soon = task({ dueDate: '2026-06-16T00:00:00' });
    const far = task({ dueDate: '2026-07-01T00:00:00' });
    const b = bucketTasks([soon, far], NOW);
    expect(b.next.map((t) => t.id)).toEqual([soon.id]);
    expect(b.later.map((t) => t.id)).toEqual([far.id]);
  });

  it('puts undated tasks in Later', () => {
    const undated = task({});
    const b = bucketTasks([undated], NOW);
    expect(b.later).toHaveLength(1);
  });

  it('excludes completed tasks and subtasks', () => {
    const done = task({ status: 'completed', dueDate: '2026-06-12T00:00:00' });
    const sub = task({ parentId: 'parent-1', dueDate: '2026-06-12T00:00:00' });
    const b = bucketTasks([done, sub], NOW);
    expect(b.now).toHaveLength(0);
    expect(b.next).toHaveLength(0);
    expect(b.later).toHaveLength(0);
  });

  it('sorts Now by due date then priority', () => {
    const lowEarly = task({ dueDate: '2026-06-10T00:00:00', priority: 4 });
    const highLate = task({ dueDate: '2026-06-12T00:00:00', priority: 1 });
    const highEarly = task({ dueDate: '2026-06-10T00:00:00', priority: 1 });
    const b = bucketTasks([lowEarly, highLate, highEarly], NOW);
    expect(b.now.map((t) => t.id)).toEqual([highEarly.id, lowEarly.id, highLate.id]);
  });

  it('sorts Later by priority', () => {
    const p4 = task({ priority: 4 });
    const p1 = task({ priority: 1 });
    const b = bucketTasks([p4, p1], NOW);
    expect(b.later.map((t) => t.priority)).toEqual([1, 4]);
  });
});

describe('isOverdue', () => {
  it('is true only for dates before today', () => {
    expect(isOverdue(task({ dueDate: '2026-06-11T23:00:00' }), NOW)).toBe(true);
    expect(isOverdue(task({ dueDate: '2026-06-12T01:00:00' }), NOW)).toBe(false);
    expect(isOverdue(task({}), NOW)).toBe(false);
  });
});

describe('formatDue', () => {
  it('includes the time when present', () => {
    expect(formatDue(task({ dueDate: '2026-06-12T00:00:00', dueTime: '15:00' }))).toMatch(/15:00/);
    expect(formatDue(task({}))).toBe('no date');
  });
});
