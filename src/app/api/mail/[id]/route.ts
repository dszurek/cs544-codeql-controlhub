import { NextRequest, NextResponse } from 'next/server';
import { markEmailRead } from '@/lib/mail';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!('isRead' in body) || typeof body.isRead !== 'boolean') {
    return NextResponse.json({ error: 'isRead (boolean) is required' }, { status: 400 });
  }

  const email = await markEmailRead(id, body.isRead as boolean);
  return NextResponse.json({ email });
}
