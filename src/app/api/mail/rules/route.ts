import { NextRequest, NextResponse } from 'next/server';
import { createEmailRule, listEmailRules } from '@/lib/emailRules';

export async function GET() {
  const rules = await listEmailRules();
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { pattern, matchType, action, label } = body;
  if (!pattern || typeof pattern !== 'string') {
    return NextResponse.json({ error: 'pattern is required' }, { status: 400 });
  }
  if (action !== 'alert' && action !== 'mute' && action !== 'spam') {
    return NextResponse.json({ error: 'action must be "alert", "mute", or "spam"' }, { status: 400 });
  }
  const mt = matchType === 'exact' || matchType === 'regex' ? matchType : 'contains';
  const rule = await createEmailRule({
    pattern,
    matchType: mt,
    action,
    label: typeof label === 'string' ? label : undefined,
  });
  return NextResponse.json({ rule }, { status: 201 });
}
