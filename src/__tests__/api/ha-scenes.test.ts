import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetConfiguredScenes, mockAddScene } = vi.hoisted(() => ({
  mockGetConfiguredScenes: vi.fn(),
  mockAddScene: vi.fn(),
}));

vi.mock('@/lib/integrations/homeassistant', () => ({
  getConfiguredScenes: mockGetConfiguredScenes,
  addScene: mockAddScene,
}));

import { GET, POST } from '@/app/api/ha/scenes/route';

function makePostRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/ha/scenes'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/ha/scenes', () => {
  beforeEach(() => {
    mockGetConfiguredScenes.mockClear();
    mockAddScene.mockClear();
  });

  it('returns scenes', async () => {
    const fakeScenes = [
      { id: 'cuid1', haEntityId: 'scene.movie', name: 'Movie Night', icon: 'mdi:movie', sortOrder: 0 },
    ];
    mockGetConfiguredScenes.mockResolvedValue(fakeScenes);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ scenes: fakeScenes });
  });
});

describe('POST /api/ha/scenes', () => {
  beforeEach(() => {
    mockGetConfiguredScenes.mockClear();
    mockAddScene.mockClear();
  });

  it('creates scene and returns 201 with valid body', async () => {
    const created = { id: 'cuid2', haEntityId: 'scene.relax', name: 'Relax', icon: null, sortOrder: 0 };
    mockAddScene.mockResolvedValue(created);

    const res = await POST(makePostRequest({ haEntityId: 'scene.relax', name: 'Relax' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ scene: created });
    expect(mockAddScene).toHaveBeenCalledWith({ haEntityId: 'scene.relax', name: 'Relax', icon: undefined });
  });

  it('returns 400 when haEntityId is missing', async () => {
    const res = await POST(makePostRequest({ name: 'Relax' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockAddScene).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makePostRequest({ haEntityId: 'scene.relax' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(mockAddScene).not.toHaveBeenCalled();
  });
});
