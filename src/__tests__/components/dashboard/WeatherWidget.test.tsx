import { render, screen, waitFor } from '@testing-library/react';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

function makeHourlyData() {
  const times: string[] = [];
  const temps: number[] = [];
  const codes: number[] = [];
  const base = new Date('2026-04-17T12:00:00');
  for (let i = 0; i < 24; i++) {
    const t = new Date(base.getTime() + i * 60 * 60 * 1000);
    times.push(t.toISOString());
    temps.push(65 + i);
    codes.push(0);
  }
  return { time: times, temperature_2m: temps, weather_code: codes };
}

function mockFetch(...responses: Array<{ ok: boolean; data: unknown }>) {
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

describe('WeatherWidget', () => {
  it('shows "Set weather location in Settings" when preferences returns nulls', async () => {
    mockFetch({
      ok: true,
      data: { weather: { lat: null, lon: null, label: null } },
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText(/set weather location in settings/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Never resolve fetch so we stay in loading state
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<WeatherWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows current temperature when data is loaded', async () => {
    mockFetch(
      {
        ok: true,
        data: { weather: { lat: '42.3', lon: '-83.1', label: 'Detroit' } },
      },
      {
        ok: true,
        data: {
          current: { time: '2026-04-17T14:00', temperature_2m: 72, weather_code: 0 },
          hourly: makeHourlyData(),
        },
      }
    );

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText(/72/)).toBeInTheDocument();
    });
  });

  it('shows condition label when data is loaded', async () => {
    mockFetch(
      {
        ok: true,
        data: { weather: { lat: '42.3', lon: '-83.1', label: 'Detroit' } },
      },
      {
        ok: true,
        data: {
          current: { time: '2026-04-17T14:00', temperature_2m: 72, weather_code: 0 },
          hourly: makeHourlyData(),
        },
      }
    );

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  it('shows location label when data is loaded', async () => {
    mockFetch(
      {
        ok: true,
        data: { weather: { lat: '42.3', lon: '-83.1', label: 'Detroit' } },
      },
      {
        ok: true,
        data: {
          current: { time: '2026-04-17T14:00', temperature_2m: 72, weather_code: 0 },
          hourly: makeHourlyData(),
        },
      }
    );

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getByText('Detroit')).toBeInTheDocument();
    });
  });
});
