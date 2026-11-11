import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '@/components/tasks/TaskItem';

const baseTask = {
  id: 'task-1',
  title: 'Buy milk',
  type: 'general',
  priority: 3,
  status: 'pending',
  dueDate: null,
  dueTime: null,
  notes: null,
  projectId: null,
  aiPriority: false,
};

const noop = () => {};

describe('TaskItem', () => {
  it('renders task title', () => {
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('renders priority badge with correct label (P3)', () => {
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('P3')).toBeInTheDocument();
  });

  it('completed task has line-through style on title', () => {
    render(
      <TaskItem
        task={{ ...baseTask, status: 'completed' }}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    const title = screen.getByText('Buy milk');
    expect(title).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('checkbox calls onComplete when clicked', () => {
    const onComplete = vi.fn();
    render(
      <TaskItem
        task={baseTask}
        onComplete={onComplete}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: /mark complete/i });
    fireEvent.click(checkbox);
    expect(onComplete).toHaveBeenCalledWith('task-1');
  });

  it('due date shows "Today" when dueDate is today', () => {
    const today = new Date();
    render(
      <TaskItem
        task={{ ...baseTask, dueDate: today }}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('overdue date shows in red', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    render(
      <TaskItem
        task={{ ...baseTask, dueDate: yesterday }}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    // Find the due date span — it should have red color
    const dueDateEl = screen.getByText(
      yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    expect(dueDateEl).toHaveStyle({ color: '#dc3545' });
  });

  it('right-click opens context menu', () => {
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    // Menu should not be visible initially
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();

    // Right-click the row
    const row = screen.getByText('Buy milk').closest('div')!;
    fireEvent.contextMenu(row);

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('clicking "Delete" from context menu calls onDelete', () => {
    const onDelete = vi.fn();
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={onDelete}
        onChangePriority={noop}
      />
    );

    const row = screen.getByText('Buy milk').closest('div')!;
    fireEvent.contextMenu(row);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('task-1');
  });

  it('clicking "P1 – Urgent" from context menu calls onChangePriority with (id, 1)', () => {
    const onChangePriority = vi.fn();
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={onChangePriority}
      />
    );

    const row = screen.getByText('Buy milk').closest('div')!;
    fireEvent.contextMenu(row);

    fireEvent.click(screen.getByText('P1 – Urgent'));
    expect(onChangePriority).toHaveBeenCalledWith('task-1', 1);
  });

  it('closes context menu when clicking outside', () => {
    render(
      <TaskItem
        task={baseTask}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    const row = screen.getByText('Buy milk').closest('div')!;
    fireEvent.contextMenu(row);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('type tag shows "ASSIGN" for assignment type, not shown for general type', () => {
    const { rerender } = render(
      <TaskItem
        task={{ ...baseTask, type: 'assignment' }}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.getByText('ASSIGN')).toBeInTheDocument();

    rerender(
      <TaskItem
        task={{ ...baseTask, type: 'general' }}
        onComplete={noop}
        onDelete={noop}
        onChangePriority={noop}
      />
    );
    expect(screen.queryByText('ASSIGN')).not.toBeInTheDocument();
  });
});
