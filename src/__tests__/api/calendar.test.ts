import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetEvents } = vi.hoisted(() => ({ mockGetEvents: vi.fn() }));

vi.mock('@/lib/calendar', () => ({
  getEvents: mockGetEvents,
}));

import { GET } from '@/app/api/calendar/route';

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/calendar', () => {
  beforeEach(() => {
    mockGetEvents.mockClear();
    mockGetEvents.mockResolvedValue([]);
  });

  it('returns events with no params, calls getEvents({})', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar'));
    const body = await res.json();
    expect(body).toEqual({ events: [] });
    expect(mockGetEvents).toHaveBeenCalledWith({});
  });

  it('passes source param to getEvents', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar?source=outlook'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ events: [] });
    expect(mockGetEvents).toHaveBeenCalledWith({ source: 'outlook' });
  });

  it('passes startDate as Date object to getEvents', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar?startDate=2026-01-01'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ events: [] });
    expect(mockGetEvents).toHaveBeenCalledWith({ startDate: new Date('2026-01-01') });
  });

  it('returns 400 for invalid startDate', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar?startDate=bad'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid startDate' });
    expect(mockGetEvents).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid endDate', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar?endDate=not-a-date'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid endDate' });
    expect(mockGetEvents).not.toHaveBeenCalled();
  });

  it('passes endDate as Date object to getEvents', async () => {
    const res = await GET(makeRequest('http://localhost/api/calendar?endDate=2026-12-31'));
    expect(res.status).toBe(200);
    expect(mockGetEvents).toHaveBeenCalledWith({ endDate: new Date('2026-12-31') });
  });
});
