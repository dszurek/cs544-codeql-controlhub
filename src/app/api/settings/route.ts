import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting, getSettings } from '@/lib/settings';
import { isSensitiveKey } from '@/lib/auth';

const REDACTED = '••••••••';

function redact(key: string, value: string | null): string | null {
  if (value && isSensitiveKey(key)) return REDACTED;
  return value;
}

export async function GET(request: NextRequest) {
  const keys = request.nextUrl.searchParams.get('keys');
  const key = request.nextUrl.searchParams.get('key');

  if (keys) {
    const result = await getSettings(keys.split(',').map((k) => k.trim()));
    const redacted = Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k, redact(k, v)]),
    );
    return NextResponse.json(redacted);
  }

  if (key) {
    const value = await getSetting(key);
    return NextResponse.json({ key, value: redact(key, value) });
  }

  return NextResponse.json({ error: 'Provide ?key=<k> or ?keys=<k1,k2>' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, value } = body as { key?: string; value?: string };

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  await setSetting(key, value);
  return NextResponse.json({ ok: true });
}
