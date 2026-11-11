import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockCallService } = vi.hoisted(() => ({ mockCallService: vi.fn() }));

vi.mock('@/lib/integrations/homeassistant', () => ({
  callService: mockCallService,
}));

import { POST } from '@/app/api/ha/service/route';

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/ha/service'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/ha/service', () => {
  beforeEach(() => {
    mockCallService.mockClear();
  });

  it('calls callService and returns { ok: true } on valid body', async () => {
    mockCallService.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ domain: 'light', service: 'turn_on', serviceData: { entity_id: 'light.kitchen' } }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockCallService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.kitchen' });
  });

  it('returns 400 when domain is missing', async () => {
    const res = await POST(makeRequest({ service: 'turn_on' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockCallService).not.toHaveBeenCalled();
  });

  it('returns 400 when service is missing', async () => {
    const res = await POST(makeRequest({ domain: 'light' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockCallService).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const req = new NextRequest(new URL('http://localhost/api/ha/service'), {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
  });
});
