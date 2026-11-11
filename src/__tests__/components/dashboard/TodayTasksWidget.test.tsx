import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayTasksWidget } from '@/components/dashboard/TodayTasksWidget';

function mockFetch(response: { ok: boolean; data: unknown }) {
  vi.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: response.ok,
      json: () => Promise.resolve(response.data),
    } as Response)
  );
}

function mockFetchSequence(...responses: Array<{ ok: boolean; data: unknown }>) {
  let callIndex = 0;
  vi.spyOn(global, 'fetch').mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: resp.ok,
      json: () => Promise.resolve(resp.data),
    } as Response);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleTasks = [
  {
    id: 'task-1',
    title: 'Write unit tests',
    priority: 1,
    status: 'pending',
  },
  {
    id: 'task-2',
    title: 'Review PR',
    priority: 2,
    status: 'pending',
  },
  {
    id: 'task-3',
    title: 'Update docs',
    priority: 3,
    status: 'completed',
  },
];

describe('TodayTasksWidget', () => {
  it('renders loading state initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<TodayTasksWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders empty state when no tasks', async () => {
    mockFetch({ ok: true, data: { tasks: [] } });

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no tasks due today/i)).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    mockFetch({ ok: false, data: {} });

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load tasks/i)).toBeInTheDocument();
    });
  });

  it('renders tasks with priority chips', async () => {
    mockFetch({ ok: true, data: { tasks: sampleTasks } });

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
      expect(screen.getByText('Review PR')).toBeInTheDocument();
      expect(screen.getByText('Update docs')).toBeInTheDocument();
    });

    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
  });

  it('renders completed tasks with line-through style', async () => {
    mockFetch({ ok: true, data: { tasks: sampleTasks } });

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText('Update docs')).toBeInTheDocument();
    });

    const completedTitle = screen.getByText('Update docs');
    expect(completedTitle).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('clicking checkbox calls PATCH and optimistically strikes through the task', async () => {
    const user = userEvent.setup();

    mockFetchSequence(
      { ok: true, data: { tasks: sampleTasks } },
      { ok: true, data: { id: 'task-1', status: 'completed' } }
    );

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('button', { name: /mark complete/i });
    // First pending task's checkbox
    await user.click(checkboxes[0]);

    // After optimistic update, the title should be struck through
    await waitFor(() => {
      const title = screen.getByText('Write unit tests');
      expect(title).toHaveStyle({ textDecoration: 'line-through' });
    });

    // Verify PATCH was called
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const patchCall = fetchCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0].includes('task-1') &&
        (call[1] as RequestInit)?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
  });

  it('reverts optimistic update when PATCH fails', async () => {
    const user = userEvent.setup();

    mockFetchSequence(
      { ok: true, data: { tasks: sampleTasks } },
      { ok: false, data: {} }
    );

    render(<TodayTasksWidget />);

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('button', { name: /mark complete/i });
    await user.click(checkboxes[0]);

    // After revert, should not be struck through
    await waitFor(() => {
      const title = screen.getByText('Write unit tests');
      expect(title).not.toHaveStyle({ textDecoration: 'line-through' });
    });
  });
});
