import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { password } = body;
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'password is required' }, { status: 400 });
  }

  const valid = verifyPassword(password);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Sets the httpOnly session cookie. The signing secret stays server-side.
  await createSession();

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { destroySession } = await import('@/lib/auth');
  await destroySession();
  return NextResponse.json({ ok: true });
}
