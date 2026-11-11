import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMarkEmailRead } = vi.hoisted(() => ({ mockMarkEmailRead: vi.fn() }));

vi.mock('@/lib/mail', () => ({
  markEmailRead: mockMarkEmailRead,
}));

import { PATCH } from '@/app/api/mail/[id]/route';

const MOCK_EMAIL = {
  id: 'email-123',
  subject: 'Test',
  senderName: 'Sender',
  senderEmail: 'sender@example.com',
  isRead: true,
  source: 'outlook',
  sourceId: 'src-1',
  receivedAt: new Date().toISOString(),
};

function makeRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/mail/[id]', () => {
  beforeEach(() => {
    mockMarkEmailRead.mockClear();
    mockMarkEmailRead.mockResolvedValue(MOCK_EMAIL);
  });

  it('calls markEmailRead and returns email on valid body', async () => {
    const res = await PATCH(makeRequest('http://localhost/api/mail/email-123', { isRead: true }), makeParams('email-123'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ email: MOCK_EMAIL });
    expect(mockMarkEmailRead).toHaveBeenCalledWith('email-123', true);
  });

  it('calls markEmailRead with isRead=false', async () => {
    const updatedEmail = { ...MOCK_EMAIL, isRead: false };
    mockMarkEmailRead.mockResolvedValue(updatedEmail);
    const res = await PATCH(makeRequest('http://localhost/api/mail/email-123', { isRead: false }), makeParams('email-123'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ email: updatedEmail });
    expect(mockMarkEmailRead).toHaveBeenCalledWith('email-123', false);
  });

  it('returns 400 when isRead is missing from body', async () => {
    const res = await PATCH(makeRequest('http://localhost/api/mail/email-123', {}), makeParams('email-123'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'isRead (boolean) is required' });
    expect(mockMarkEmailRead).not.toHaveBeenCalled();
  });

  it('returns 400 when isRead is a string instead of boolean', async () => {
    const res = await PATCH(makeRequest('http://localhost/api/mail/email-123', { isRead: 'true' }), makeParams('email-123'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'isRead (boolean) is required' });
    expect(mockMarkEmailRead).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest(new URL('http://localhost/api/mail/email-123'), {
      method: 'PATCH',
      body: 'not json{{{',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, makeParams('email-123'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid JSON body' });
    expect(mockMarkEmailRead).not.toHaveBeenCalled();
  });
});
