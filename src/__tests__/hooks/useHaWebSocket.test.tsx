import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect, type Mock } from 'vitest';
import { useHaWebSocket } from '@/hooks/useHaWebSocket';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.(new Event('close') as CloseEvent);
  }

  // Test helpers
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  // @ts-expect-error replace global
  global.WebSocket = MockWebSocket;
  global.fetch = vi.fn();
});

describe('useHaWebSocket', () => {
  it('returns disconnected status when /api/ha/config returns nulls', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: null, token: null }),
    });

    const { result } = renderHook(() => useHaWebSocket());

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected');
    });

    expect(MockWebSocket.instances.length).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('opens WebSocket with correct ws:// URL', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://ha.local:8123', token: 'tok' }),
    });

    renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));

    expect(MockWebSocket.instances[0].url).toBe('ws://ha.local:8123/api/websocket');
  });

  it('converts https:// to wss:// for WebSocket URL', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://ha.secure:8123', token: 'tok' }),
    });

    renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));

    expect(MockWebSocket.instances[0].url).toBe('wss://ha.secure:8123/api/websocket');
  });

  it('sends auth message on auth_required', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://ha.local:8123', token: 'mytoken' }),
    });

    renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
      ws.simulateMessage({ type: 'auth_required', ha_version: '2024.1.0' });
    });

    expect(ws.sent.length).toBeGreaterThanOrEqual(1);
    const authMsg = JSON.parse(ws.sent[0]);
    expect(authMsg).toEqual({ type: 'auth', access_token: 'mytoken' });
  });

  it('populates states from get_states result', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://ha.local:8123', token: 'tok' }),
    });

    const { result } = renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
      ws.simulateMessage({ type: 'auth_required' });
    });
    act(() => {
      ws.simulateMessage({ type: 'auth_ok' });
    });
    act(() => {
      ws.simulateMessage({
        id: 1,
        type: 'result',
        success: true,
        result: [
          {
            entity_id: 'light.kitchen',
            state: 'on',
            attributes: {},
            last_changed: '',
            last_updated: '',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.states['light.kitchen']?.state).toBe('on');
    });

    expect(result.current.status).toBe('connected');
  });

  it('updates state when state_changed event received', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://ha.local:8123', token: 'tok' }),
    });

    const { result } = renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
      ws.simulateMessage({ type: 'auth_required' });
    });
    act(() => {
      ws.simulateMessage({ type: 'auth_ok' });
    });
    act(() => {
      ws.simulateMessage({
        id: 1,
        type: 'result',
        success: true,
        result: [
          {
            entity_id: 'light.kitchen',
            state: 'on',
            attributes: {},
            last_changed: '',
            last_updated: '',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.states['light.kitchen']?.state).toBe('on');
    });

    act(() => {
      ws.simulateMessage({
        id: 2,
        type: 'event',
        event: {
          event_type: 'state_changed',
          data: {
            entity_id: 'light.kitchen',
            new_state: {
              entity_id: 'light.kitchen',
              state: 'off',
              attributes: {},
              last_changed: '',
              last_updated: '',
            },
            old_state: {
              entity_id: 'light.kitchen',
              state: 'on',
              attributes: {},
              last_changed: '',
              last_updated: '',
            },
          },
        },
      });
    });

    await waitFor(() => {
      expect(result.current.states['light.kitchen']?.state).toBe('off');
    });
  });

  it('sets error status on auth_invalid', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'http://ha.local:8123', token: 'bad-token' }),
    });

    const { result } = renderHook(() => useHaWebSocket());

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
      ws.simulateMessage({ type: 'auth_required' });
    });
    act(() => {
      ws.simulateMessage({ type: 'auth_invalid' });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe('Authentication failed');
  });

  it('falls back to /api/ha/states REST when WebSocket config is missing', async () => {
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (url === '/api/ha/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ url: null, token: null }),
        });
      }
      if (url === '/api/ha/states') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            states: [
              {
                entity_id: 'sensor.temperature',
                state: '22.5',
                attributes: {},
                last_changed: '',
                last_updated: '',
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { result } = renderHook(() => useHaWebSocket());

    await waitFor(() => {
      expect(result.current.states['sensor.temperature']?.state).toBe('22.5');
    });
  });
});
