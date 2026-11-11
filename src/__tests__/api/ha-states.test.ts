import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetStates } = vi.hoisted(() => ({ mockGetStates: vi.fn() }));

vi.mock('@/lib/integrations/homeassistant', () => ({
  getStates: mockGetStates,
}));

import { GET } from '@/app/api/ha/states/route';

describe('GET /api/ha/states', () => {
  beforeEach(() => {
    mockGetStates.mockClear();
  });

  it('returns states on success', async () => {
    const fakeStates = [
      { entity_id: 'light.kitchen', state: 'on', attributes: {}, last_changed: '', last_updated: '' },
    ];
    mockGetStates.mockResolvedValue(fakeStates);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ states: fakeStates });
  });

  it('returns 502 with error on failure', async () => {
    mockGetStates.mockRejectedValue(new Error('HA unreachable'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ states: [], error: 'HA unreachable' });
  });
});
