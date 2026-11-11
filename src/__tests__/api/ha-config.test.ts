import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetHaConfig } = vi.hoisted(() => ({ mockGetHaConfig: vi.fn() }));

vi.mock('@/lib/integrations/homeassistant', () => ({
  getHaConfig: mockGetHaConfig,
}));

import { GET } from '@/app/api/ha/config/route';

describe('GET /api/ha/config', () => {
  beforeEach(() => {
    mockGetHaConfig.mockClear();
  });

  it('returns url and token when configured', async () => {
    mockGetHaConfig.mockResolvedValue({ url: 'http://ha.local:8123', token: 'mytoken' });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: 'http://ha.local:8123', token: 'mytoken' });
  });

  it('returns null url and token when not configured', async () => {
    mockGetHaConfig.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: null, token: null });
  });
});
