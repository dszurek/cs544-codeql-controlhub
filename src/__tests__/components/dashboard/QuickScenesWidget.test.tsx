import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickScenesWidget } from '@/components/dashboard/QuickScenesWidget';

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
  vi.useRealTimers();
});

const sampleScenes = [
  { id: 'scene-1', haEntityId: 'scene.movie_night', name: 'Movie Night', icon: '🎬', sortOrder: 0 },
  { id: 'scene-2', haEntityId: 'scene.reading', name: 'Reading', icon: '📖', sortOrder: 1 },
];

describe('QuickScenesWidget', () => {
  it('renders loading state initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<QuickScenesWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders configured scenes', async () => {
    mockFetch({ ok: true, data: { scenes: sampleScenes } });

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
    });

    expect(screen.getByText('🎬')).toBeInTheDocument();
    expect(screen.getByText('📖')).toBeInTheDocument();
  });

  it('renders empty state when scenes array is empty', async () => {
    mockFetch({ ok: true, data: { scenes: [] } });

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText(/no scenes configured/i)).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    mockFetch({ ok: false, data: {} });

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load scenes/i)).toBeInTheDocument();
    });
  });

  it('uses default icon when scene.icon is null', async () => {
    const scenesWithoutIcon = [
      { id: 'scene-1', haEntityId: 'scene.movie_night', name: 'Movie Night', icon: null, sortOrder: 0 },
    ];
    mockFetch({ ok: true, data: { scenes: scenesWithoutIcon } });

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument();
    });

    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('clicking a scene POSTs to /api/ha/service with correct body', async () => {
    const user = userEvent.setup();

    mockFetchSequence(
      { ok: true, data: { scenes: sampleScenes } },
      { ok: true, data: {} }
    );

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument();
    });

    const movieNightBtn = screen.getByRole('button', { name: /movie night/i });
    await user.click(movieNightBtn);

    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const postCall = fetchCalls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' &&
        call[0] === '/api/ha/service' &&
        (call[1] as RequestInit)?.method === 'POST'
    );

    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual({
      domain: 'scene',
      service: 'turn_on',
      serviceData: { entity_id: 'scene.movie_night' },
    });
  });

  it('shows "Activated!" after clicking a scene and reverts after timeout', async () => {
    // Use fake timers but keep microtasks/promises working via shouldAdvanceTime
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockFetchSequence(
      { ok: true, data: { scenes: sampleScenes } },
      { ok: true, data: {} }
    );

    render(<QuickScenesWidget />);

    await waitFor(() => {
      expect(screen.getByText('Movie Night')).toBeInTheDocument();
    });

    const movieNightBtn = screen.getByRole('button', { name: /movie night/i });
    await user.click(movieNightBtn);

    await waitFor(() => {
      expect(screen.getByText('Activated!')).toBeInTheDocument();
    });

    // Advance past the 1500ms timeout
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.queryByText('Activated!')).not.toBeInTheDocument();
    expect(screen.getByText('Movie Night')).toBeInTheDocument();
  });
});
