import { NextRequest, NextResponse } from 'next/server';
import { runBriefing } from '@/lib/briefing';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok */
  }
  const model = typeof body.model === 'string' ? body.model : 'sonnet';

  // Fire-and-forget: Claude invocation can take 30s+
  runBriefing(model).catch(() => {});
  return NextResponse.json({ ok: true, model }, { status: 202 });
}
