import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/db';

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HaConfig {
  url: string;
  token: string;
}

export async function getHaConfig(): Promise<HaConfig | null> {
  const settings = await getSettings(['ha_url', 'ha_token']);
  const url = settings['ha_url'];
  const token = settings['ha_token'];
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

async function haFetch(path: string, init?: RequestInit): Promise<Response> {
  const config = await getHaConfig();
  if (!config) throw new Error('Home Assistant not configured');
  const res = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`HA ${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  return res;
}

export async function getStates(): Promise<HaState[]> {
  const res = await haFetch('/api/states');
  return res.json();
}

export async function getState(entityId: string): Promise<HaState> {
  const config = await getHaConfig();
  if (!config) throw new Error('Home Assistant not configured');
  const res = await fetch(`${config.url}/api/states/${entityId}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 404) throw new Error('Entity not found');
  if (!res.ok) throw new Error(`HA GET /api/states/${entityId} failed: ${res.status}`);
  return res.json();
}

export async function callService(
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
): Promise<void> {
  await haFetch(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(serviceData ?? {}),
  });
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const config = await getHaConfig();
    if (!config) return { ok: false, error: 'Not configured' };
    const res = await fetch(`${config.url}/api/`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HA API returned ${res.status}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function getConfiguredScenes(): Promise<
  Array<{
    id: string;
    haEntityId: string;
    name: string;
    icon: string | null;
    sortOrder: number;
  }>
> {
  return prisma.homeAssistantScene.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function addScene(data: {
  haEntityId: string;
  name: string;
  icon?: string;
  sortOrder?: number;
}): Promise<{ id: string; haEntityId: string; name: string; icon: string | null; sortOrder: number }> {
  return prisma.homeAssistantScene.create({ data });
}

export async function removeScene(id: string): Promise<void> {
  await prisma.homeAssistantScene.delete({ where: { id } });
}

export async function reorderScenes(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, i) => prisma.homeAssistantScene.update({ where: { id }, data: { sortOrder: i } })));
}
