import { NextRequest, NextResponse } from 'next/server';
import { reorderScenes } from '@/lib/integrations/homeassistant';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids } = body;

  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === 'string')
  ) {
    return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 });
  }

  await reorderScenes(ids);
  return NextResponse.json({ ok: true });
}
