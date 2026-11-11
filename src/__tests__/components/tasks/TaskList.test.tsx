import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from '@/components/tasks/TaskList';
import type { Task } from '@prisma/client';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Buy milk',
  notes: null,
  description: null,
  type: 'general',
  priority: 3,
  status: 'pending',
  dueDate: null,
  dueTime: null,
  startDate: null,
  estimatedMinutes: null,
  courseId: null,
  recurrence: null,
  projectId: null,
  parentId: null,
  source: 'manual',
  externalId: null,
  aiPriority: false,
  snoozedUntil: null,
  blockStart: null,
  blockEnd: null,
  blockPinned: false,
  blockSource: null,
  createdAt: new Date('2026-04-14T00:00:00'),
  completedAt: null,
  ...overrides,
});

const noop = () => {};

describe('TaskList', () => {
  it('renders task titles in flat mode (groupBy="none")', () => {
    const tasks = [
      makeTask({ id: 'task-1', title: 'Buy milk' }),
      makeTask({ id: 'task-2', title: 'Read book' }),
    ];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Read book')).toBeInTheDocument();
  });

  it('shows "No tasks" when tasks array is empty', () => {
    render(
      <TaskList
        tasks={[]}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('No tasks')).toBeInTheDocument();
  });

  it('renders group headings when groupBy="priority"', () => {
    const tasks = [
      makeTask({ id: 'task-1', title: 'Urgent task', priority: 1 }),
      makeTask({ id: 'task-2', title: 'Low task', priority: 4 }),
    ];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="priority"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('P1 – Urgent')).toBeInTheDocument();
    expect(screen.getByText('P4 – Low')).toBeInTheDocument();
  });

  it('selecting a task shows the bulk action bar', () => {
    const tasks = [makeTask({ id: 'task-1', title: 'Buy milk' })];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
        onBulkComplete={noop}
        onBulkDelete={noop}
      />
    );
    // Bulk bar not visible initially
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();

    // Click the selection checkbox (the outer one, not the TaskItem's internal checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the selection one (before TaskItem's internal checkbox)
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('clicking "Complete" in bulk bar calls onBulkComplete with selected ids', () => {
    const onBulkComplete = vi.fn();
    const tasks = [makeTask({ id: 'task-1', title: 'Buy milk' })];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
        onBulkComplete={onBulkComplete}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Complete'));
    expect(onBulkComplete).toHaveBeenCalledWith(['task-1']);
  });

  it('clicking "Delete" in bulk bar calls onBulkDelete with selected ids', () => {
    const onBulkDelete = vi.fn();
    const tasks = [makeTask({ id: 'task-1', title: 'Buy milk' })];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
        onBulkDelete={onBulkDelete}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByText('Delete'));
    expect(onBulkDelete).toHaveBeenCalledWith(['task-1']);
  });

  it('renders project group headings when groupBy="project"', () => {
    const tasks = [
      makeTask({ id: 'task-1', title: 'Work task', projectId: 'p-1' }),
      makeTask({ id: 'task-2', title: 'Personal task', projectId: null }),
    ];
    render(
      <TaskList
        tasks={tasks}
        projects={[{ id: 'p-1', name: 'Work' }]}
        groupBy="project"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('No project')).toBeInTheDocument();
    expect(screen.getByText('Work task')).toBeInTheDocument();
    expect(screen.getByText('Personal task')).toBeInTheDocument();
  });

  it('renders dueDate group headings when groupBy="dueDate"', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // local noon to avoid timezone issues
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const tasks = [
      makeTask({ id: 'task-1', title: 'Today task', dueDate: today }),
      makeTask({ id: 'task-2', title: 'Overdue task', dueDate: yesterday }),
    ];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="dueDate"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    // "Today" appears as both the group heading and a due-date badge in TaskItem
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Today task')).toBeInTheDocument();
    expect(screen.getByText('Overdue task')).toBeInTheDocument();
  });

  it('deselecting all tasks hides the bulk action bar', () => {
    const tasks = [makeTask({ id: 'task-1', title: 'Buy milk' })];
    render(
      <TaskList
        tasks={tasks}
        projects={[]}
        groupBy="none"
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
        onBulkComplete={noop}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // select
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(checkboxes[0]); // deselect
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });
});
