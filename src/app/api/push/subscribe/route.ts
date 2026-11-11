import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const endpoint = body?.endpoint;
    const keys = body?.keys;
    if (typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys: JSON.stringify({ p256dh: keys.p256dh, auth: keys.auth }) },
      create: {
        endpoint,
        keys: JSON.stringify({ p256dh: keys.p256dh, auth: keys.auth }),
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push/subscribe]', e);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (typeof body?.endpoint === 'string') {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push/unsubscribe]', e);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
