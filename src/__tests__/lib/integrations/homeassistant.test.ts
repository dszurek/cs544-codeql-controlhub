import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

const { mockFindMany, mockCreate, mockDelete, mockUpdate, mockTransaction } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    homeAssistantScene: {
      findMany: mockFindMany,
      create: mockCreate,
      delete: mockDelete,
      update: mockUpdate,
    },
    $transaction: mockTransaction,
  },
}));

import { getSettings } from '@/lib/settings';
import {
  getHaConfig,
  getStates,
  callService,
  testConnection,
  getConfiguredScenes,
  addScene,
  removeScene,
  reorderScenes,
} from '@/lib/integrations/homeassistant';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── getHaConfig ──────────────────────────────────────────────────────────────

describe('getHaConfig', () => {
  it('returns null when url is missing', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ha_url: null, ha_token: 'tok' });
    const result = await getHaConfig();
    expect(result).toBeNull();
  });

  it('returns null when token is missing', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ha_url: 'http://ha.local:8123', ha_token: null });
    const result = await getHaConfig();
    expect(result).toBeNull();
  });

  it('strips trailing slash from url', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ha_url: 'http://ha.local:8123/',
      ha_token: 'mytoken',
    });
    const result = await getHaConfig();
    expect(result).toEqual({ url: 'http://ha.local:8123', token: 'mytoken' });
  });
});

// ─── getStates ────────────────────────────────────────────────────────────────

describe('getStates', () => {
  it('calls fetch with correct URL and Bearer token', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ha_url: 'http://ha.local:8123',
      ha_token: 'mytoken',
    });

    const fakeStates = [{ entity_id: 'light.kitchen', state: 'on', attributes: {}, last_changed: '', last_updated: '' }];
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => fakeStates,
    });

    const result = await getStates();

    expect(fetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/states',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mytoken',
        }),
      }),
    );
    expect(result).toEqual(fakeStates);
  });
});

// ─── callService ──────────────────────────────────────────────────────────────

describe('callService', () => {
  it('POSTs with correct URL and body', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ha_url: 'http://ha.local:8123',
      ha_token: 'mytoken',
    });

    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    await callService('light', 'turn_on', { entity_id: 'light.kitchen', brightness: 128 });

    expect(fetch).toHaveBeenCalledWith(
      'http://ha.local:8123/api/services/light/turn_on',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ entity_id: 'light.kitchen', brightness: 128 }),
        headers: expect.objectContaining({
          Authorization: 'Bearer mytoken',
        }),
      }),
    );
  });
});

// ─── testConnection ───────────────────────────────────────────────────────────

describe('testConnection', () => {
  it('returns { ok: false, error: "Not configured" } when config missing', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ha_url: null, ha_token: null });
    const result = await testConnection();
    expect(result).toEqual({ ok: false, error: 'Not configured' });
  });

  it('returns { ok: true } on 200 response', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ha_url: 'http://ha.local:8123',
      ha_token: 'mytoken',
    });
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const result = await testConnection();
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: false, error: ... } on fetch failure', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ha_url: 'http://ha.local:8123',
      ha_token: 'mytoken',
    });
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const result = await testConnection();
    expect(result).toEqual({ ok: false, error: 'Network error' });
  });
});

// ─── getConfiguredScenes ──────────────────────────────────────────────────────

describe('getConfiguredScenes', () => {
  it('calls prisma.homeAssistantScene.findMany with sortOrder asc', async () => {
    mockFindMany.mockResolvedValue([]);
    await getConfiguredScenes();
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } });
  });
});

// ─── addScene ─────────────────────────────────────────────────────────────────

describe('addScene', () => {
  it('calls prisma.homeAssistantScene.create with provided data', async () => {
    const sceneData = { haEntityId: 'scene.movie', name: 'Movie Night', icon: 'mdi:movie' };
    const created = { id: 'cuid1', ...sceneData, sortOrder: 0 };
    mockCreate.mockResolvedValue(created);

    const result = await addScene(sceneData);

    expect(mockCreate).toHaveBeenCalledWith({ data: sceneData });
    expect(result).toEqual(created);
  });
});

// ─── removeScene ──────────────────────────────────────────────────────────────

describe('removeScene', () => {
  it('calls prisma.homeAssistantScene.delete with correct id', async () => {
    mockDelete.mockResolvedValue({});
    await removeScene('cuid1');
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'cuid1' } });
  });
});

// ─── reorderScenes ────────────────────────────────────────────────────────────

describe('reorderScenes', () => {
  it('calls prisma.$transaction with update calls for each id', async () => {
    mockTransaction.mockResolvedValue([]);
    // We need to capture what gets passed to $transaction
    // Since prisma.homeAssistantScene.update returns a promise/query builder,
    // we verify $transaction is called and update is invoked for each id
    await reorderScenes(['id-a', 'id-b', 'id-c']);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'id-a' }, data: { sortOrder: 0 } });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'id-b' }, data: { sortOrder: 1 } });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'id-c' }, data: { sortOrder: 2 } });
  });
});
