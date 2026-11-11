import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSetting, setSetting } from '@/lib/settings';

const TOKEN_KEY = 'calendar_feed_token';

async function getOrCreateToken(): Promise<string> {
  const existing = await getSetting(TOKEN_KEY);
  if (existing) return existing;
  const token = randomBytes(24).toString('hex');
  await setSetting(TOKEN_KEY, token);
  return token;
}

export async function GET(request: NextRequest) {
  const token = await getOrCreateToken();
  const url = new URL(request.url);
  const feedUrl = `${url.origin}/api/calendar/feed/${token}`;
  return NextResponse.json({ token, url: feedUrl });
}

export async function POST() {
  const token = randomBytes(24).toString('hex');
  await setSetting(TOKEN_KEY, token);
  return NextResponse.json({ token, rotated: true });
}
