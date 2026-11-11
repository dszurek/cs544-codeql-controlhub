import { render, screen, fireEvent } from '@testing-library/react';
import { AddTaskSheet } from '@/components/tasks/AddTaskSheet';

vi.mock('chrono-node', () => ({
  parseDate: vi.fn((text: string) => {
    if (text === 'tomorrow') return new Date('2026-04-16T12:00:00');
    if (text === 'gibberish') return null;
    return null;
  }),
}));

const noopClose = vi.fn();
const noopAdd = vi.fn();
const projects = [{ id: 'p-1', name: 'Work' }];

describe('AddTaskSheet', () => {
  beforeEach(() => {
    noopAdd.mockClear();
    noopClose.mockClear();
  });

  it('does not render when open is false', () => {
    render(
      <AddTaskSheet open={false} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
  });

  it('renders the form when open is true', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    expect(screen.getByRole('heading', { name: 'Add Task' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Task title')).toBeInTheDocument();
  });

  it('shows "Title is required" when submitting with empty title', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(noopAdd).not.toHaveBeenCalled();
  });

  it('calls onAdd with correct data and onClose when form is valid and submitted', () => {
    const onClose = vi.fn();
    render(
      <AddTaskSheet open={true} onClose={onClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'My task' },
    });
    fireEvent.change(screen.getByPlaceholderText('Notes (optional)'), {
      target: { value: 'Some notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(noopAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My task',
        notes: 'Some notes',
        type: 'general',
        priority: 4,
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <AddTaskSheet open={true} onClose={onClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay (backdrop) is clicked', () => {
    const onClose = vi.fn();
    render(
      <AddTaskSheet open={true} onClose={onClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.click(screen.getByTestId('sheet-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows parsed date preview when due date text is parseable', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: 'tomorrow' },
    });
    expect(screen.getByText(/Parsed:/)).toBeInTheDocument();
  });

  it('shows "Could not parse date" when due date text is not parseable', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: 'gibberish' },
    });
    expect(screen.getByText('Could not parse date')).toBeInTheDocument();
  });

  it('calls onAdd with parsed dueDate when due date field has valid NLP text', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    fireEvent.change(screen.getByPlaceholderText('Task title'), {
      target: { value: 'Scheduled task' },
    });
    fireEvent.change(screen.getByLabelText('Due Date'), {
      target: { value: 'tomorrow' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    expect(noopAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Scheduled task',
        dueDate: new Date('2026-04-16T12:00:00'),
        dueTime: '12:00',
      })
    );
  });

  it('project select shows "No project" option plus projects from props', () => {
    render(
      <AddTaskSheet open={true} onClose={noopClose} onAdd={noopAdd} projects={projects} />
    );
    const select = screen.getByLabelText(/project/i);
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toContain('No project');
    expect(options).toContain('Work');
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <AddTaskSheet open={true} onClose={onClose} onAdd={noopAdd} projects={[]} />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
