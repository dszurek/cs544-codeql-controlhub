import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateNote, isoDate, updateNote } from '@/lib/dailyNote';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const date = sp.get('date') || isoDate();
  const note = await getOrCreateNote(date);
  return NextResponse.json({ note });
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const date = typeof body.date === 'string' ? body.date : isoDate();
  const content = typeof body.body === 'string' ? body.body : '';
  await getOrCreateNote(date);
  await updateNote(date, content);
  return NextResponse.json({ ok: true });
}
