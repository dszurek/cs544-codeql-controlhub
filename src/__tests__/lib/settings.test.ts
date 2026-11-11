import { getSetting, setSetting, getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    settings: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSetting', () => {
  it('returns the value when the setting exists', async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ key: 'ha_url', value: 'http://homeassistant.local:8123' });
    const result = await getSetting('ha_url');
    expect(result).toBe('http://homeassistant.local:8123');
    expect(prisma.settings.findUnique).toHaveBeenCalledWith({ where: { key: 'ha_url' } });
  });

  it('returns null when the setting does not exist', async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
    const result = await getSetting('nonexistent');
    expect(result).toBeNull();
  });
});

describe('setSetting', () => {
  it('upserts the setting with correct arguments', async () => {
    vi.mocked(prisma.settings.upsert).mockResolvedValue({ key: 'ha_token', value: 'abc123' });
    await setSetting('ha_token', 'abc123');
    expect(prisma.settings.upsert).toHaveBeenCalledWith({
      where: { key: 'ha_token' },
      update: { value: 'abc123' },
      create: { key: 'ha_token', value: 'abc123' },
    });
  });
});

describe('getSettings', () => {
  it('returns a map with values for found keys and null for missing keys', async () => {
    vi.mocked(prisma.settings.findMany).mockResolvedValue([
      { key: 'ha_url', value: 'http://homeassistant.local:8123' },
      { key: 'ha_token', value: 'abc123' },
    ]);
    const result = await getSettings(['ha_url', 'ha_token', 'icloud_email']);
    expect(result).toEqual({
      ha_url: 'http://homeassistant.local:8123',
      ha_token: 'abc123',
      icloud_email: null,
    });
    expect(prisma.settings.findMany).toHaveBeenCalledWith({
      where: { key: { in: ['ha_url', 'ha_token', 'icloud_email'] } },
    });
  });

  it('returns all nulls when no settings exist', async () => {
    vi.mocked(prisma.settings.findMany).mockResolvedValue([]);
    const result = await getSettings(['a', 'b']);
    expect(result).toEqual({ a: null, b: null });
  });
});
