import { GET, POST } from '@/app/api/settings/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn().mockResolvedValue('test-value'),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue({ ha_url: 'http://ha.local', ha_token: null }),
}));

describe('GET /api/settings', () => {
  it('returns a single setting when key param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings?key=ha_url');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ key: 'ha_url', value: 'test-value' });
  });

  it('returns multiple settings when keys param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings?keys=ha_url,ha_token');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ha_url: 'http://ha.local', ha_token: null });
  });

  it('returns 400 when neither key nor keys param is provided', async () => {
    const req = new NextRequest('http://localhost/api/settings');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/settings', () => {
  it('saves a setting and returns ok', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'ha_url', value: 'http://ha.local' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
  });

  it('returns 400 when key is missing', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ value: 'something' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when value is missing', async () => {
    const req = new NextRequest('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'ha_url' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
