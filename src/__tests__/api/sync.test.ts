import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOutlookSync, mockGmailSync, mockIcloudSync } = vi.hoisted(() => ({
  mockOutlookSync: vi.fn().mockResolvedValue(undefined),
  mockGmailSync: vi.fn().mockResolvedValue(undefined),
  mockIcloudSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/outlook', () => ({ sync: mockOutlookSync }));
vi.mock('@/lib/integrations/gmail', () => ({ sync: mockGmailSync }));
vi.mock('@/lib/integrations/icloud', () => ({ sync: mockIcloudSync }));

import { POST } from '@/app/api/sync/route';

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/sync'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/sync', () => {
  beforeEach(() => {
    mockOutlookSync.mockClear();
    mockGmailSync.mockClear();
    mockIcloudSync.mockClear();
  });

  it('returns 202 with { ok: true, source: "outlook" } for outlook source', async () => {
    const res = await POST(makeRequest({ source: 'outlook' }));
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body).toEqual({ ok: true, source: 'outlook' });
  });

  it('triggers outlook sync in background for outlook source', async () => {
    await POST(makeRequest({ source: 'outlook' }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockOutlookSync).toHaveBeenCalled();
    expect(mockGmailSync).not.toHaveBeenCalled();
    expect(mockIcloudSync).not.toHaveBeenCalled();
  });

  it('returns 202 with { ok: true, source: "gmail" } for gmail source', async () => {
    const res = await POST(makeRequest({ source: 'gmail' }));
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body).toEqual({ ok: true, source: 'gmail' });
  });

  it('triggers gmail sync in background for gmail source', async () => {
    await POST(makeRequest({ source: 'gmail' }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockGmailSync).toHaveBeenCalled();
    expect(mockOutlookSync).not.toHaveBeenCalled();
    expect(mockIcloudSync).not.toHaveBeenCalled();
  });

  it('returns 202 with { ok: true, source: "icloud" } for icloud source', async () => {
    const res = await POST(makeRequest({ source: 'icloud' }));
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body).toEqual({ ok: true, source: 'icloud' });
  });

  it('triggers all three syncs for source: "all"', async () => {
    const res = await POST(makeRequest({ source: 'all' }));
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body).toEqual({ ok: true, source: 'all' });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockOutlookSync).toHaveBeenCalled();
    expect(mockGmailSync).toHaveBeenCalled();
    expect(mockIcloudSync).toHaveBeenCalled();
  });

  it('returns 400 for invalid source', async () => {
    const res = await POST(makeRequest({ source: 'invalid' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(mockOutlookSync).not.toHaveBeenCalled();
    expect(mockGmailSync).not.toHaveBeenCalled();
    expect(mockIcloudSync).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(new URL('http://localhost/api/sync'), {
      method: 'POST',
      body: 'not json{{{',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid JSON body' });
  });
});
