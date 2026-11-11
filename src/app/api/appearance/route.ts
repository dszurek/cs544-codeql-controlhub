import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { coerceAppearance } from '@/lib/appearance';
import { getAppearance, setAppearance } from '@/lib/appearanceStore';

export async function GET() {
  try {
    return NextResponse.json({ appearance: await getAppearance() });
  } catch (e) {
    console.error('[appearance]', e);
    return NextResponse.json({ error: 'Failed to load appearance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const appearance = coerceAppearance(body.appearance ?? body);
    await setAppearance(appearance);
    return NextResponse.json({ appearance });
  } catch (e) {
    console.error('[appearance]', e);
    return NextResponse.json({ error: 'Failed to save appearance' }, { status: 500 });
  }
}
