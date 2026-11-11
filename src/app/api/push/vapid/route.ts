import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push';

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (e) {
    console.error('[push/vapid]', e);
    return NextResponse.json({ error: 'Failed to get VAPID key' }, { status: 500 });
  }
}
