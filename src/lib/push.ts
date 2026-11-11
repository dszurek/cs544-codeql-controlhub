import webpush from 'web-push';
import { prisma } from './db';
import { getSetting, setSetting } from './settings';

const SUBJECT = 'mailto:controlhub@localhost';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/** Generate-once VAPID keypair, persisted in Settings. */
export async function getVapidKeys(): Promise<VapidKeys> {
  const pub = await getSetting('vapid_public_key');
  const priv = await getSetting('vapid_private_key');
  if (pub && priv) return { publicKey: pub, privateKey: priv };

  const keys = webpush.generateVAPIDKeys();
  await setSetting('vapid_public_key', keys.publicKey);
  await setSetting('vapid_private_key', keys.privateKey);
  return keys;
}

export async function getVapidPublicKey(): Promise<string> {
  return (await getVapidKeys()).publicKey;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  glow?: string;
}

/**
 * Fan a notification out to every registered subscription. Dead
 * subscriptions (404/410) are pruned. Never throws — push is best-effort.
 */
export async function sendPush(payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const keys = await getVapidKeys();
  webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const parsedKeys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: parsedKeys },
          body,
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          pruned++;
        } else {
          console.error('[push] send failed:', err);
        }
      }
    }),
  );

  return { sent, pruned };
}
