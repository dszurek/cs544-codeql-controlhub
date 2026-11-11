import { getSettings } from '@/lib/settings';

export interface HaInvokeOptions {
  message: string;
  conversationId?: string;
}

export interface HaResult {
  conversationId: string;
  text: string;
  raw: unknown;
}

/**
 * Call Home Assistant's /api/conversation/process endpoint to speak to its
 * built-in assistant (Assist). Free and local — no API cost.
 */
export async function invokeHomeAssistant(opts: HaInvokeOptions): Promise<HaResult> {
  const { ha_url, ha_token } = await getSettings(['ha_url', 'ha_token']);
  if (!ha_url || !ha_token) {
    throw new Error('Home Assistant is not configured. Set ha_url and ha_token in Settings.');
  }
  const base = ha_url.replace(/\/+$/, '');
  const res = await fetch(`${base}/api/conversation/process`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ha_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: opts.message,
      conversation_id: opts.conversationId ?? null,
      language: 'en',
    }),
  });
  if (!res.ok) {
    throw new Error(`HA error ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as {
    conversation_id?: string;
    response?: { speech?: { plain?: { speech?: string } } };
  };
  const speech = data.response?.speech?.plain?.speech ?? '(no response)';
  return {
    conversationId: data.conversation_id ?? opts.conversationId ?? '',
    text: speech,
    raw: data,
  };
}
