import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetEmails, mockGetUnreadCounts } = vi.hoisted(() => ({
  mockGetEmails: vi.fn(),
  mockGetUnreadCounts: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  getEmails: mockGetEmails,
  getUnreadCounts: mockGetUnreadCounts,
}));

import { GET } from '@/app/api/mail/route';

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/mail', () => {
  beforeEach(() => {
    mockGetEmails.mockResolvedValue([]);
    mockGetUnreadCounts.mockResolvedValue({ outlook: 0, gmail: 0 });
  });

  it('returns emails and unreadCounts with no params, calls getEmails({})', async () => {
    const res = await GET(makeRequest('http://localhost/api/mail'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ emails: [], unreadCounts: { outlook: 0, gmail: 0 } });
    expect(mockGetEmails).toHaveBeenCalledWith({});
    expect(mockGetUnreadCounts).toHaveBeenCalled();
  });

  it('passes isRead=false to getEmails when ?isRead=false', async () => {
    const res = await GET(makeRequest('http://localhost/api/mail?isRead=false'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.unreadCounts).toEqual({ outlook: 0, gmail: 0 });
    expect(mockGetEmails).toHaveBeenCalledWith({ isRead: false });
  });

  it('passes isRead=true to getEmails when ?isRead=true', async () => {
    await GET(makeRequest('http://localhost/api/mail?isRead=true'));
    expect(mockGetEmails).toHaveBeenCalledWith({ isRead: true });
  });

  it('passes source to getEmails when ?source=gmail', async () => {
    const res = await GET(makeRequest('http://localhost/api/mail?source=gmail'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.unreadCounts).toEqual({ outlook: 0, gmail: 0 });
    expect(mockGetEmails).toHaveBeenCalledWith({ source: 'gmail' });
  });

  it('ignores unknown isRead values', async () => {
    await GET(makeRequest('http://localhost/api/mail?isRead=maybe'));
    expect(mockGetEmails).toHaveBeenCalledWith({});
  });
});
