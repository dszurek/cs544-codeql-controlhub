import { NextRequest, NextResponse } from 'next/server';
import { getTodayShutdownLog, saveShutdownLog, getShutdownContext } from '@/lib/shutdown';

export async function GET() {
  const [log, context] = await Promise.all([getTodayShutdownLog(), getShutdownContext()]);
  return NextResponse.json({ log, context });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const log = await saveShutdownLog({
    incompleteTaskIds: Array.isArray(body.incompleteTaskIds)
      ? (body.incompleteTaskIds as string[]).filter((x) => typeof x === 'string')
      : [],
    tomorrowTopIds: Array.isArray(body.tomorrowTopIds)
      ? (body.tomorrowTopIds as string[]).filter((x) => typeof x === 'string')
      : [],
    journal: typeof body.journal === 'string' ? body.journal : undefined,
  });
  return NextResponse.json({ log }, { status: 201 });
}
