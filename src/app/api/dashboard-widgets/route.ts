import { NextRequest, NextResponse } from 'next/server';
import {
  DASHBOARD_WIDGETS,
  getWidgetVisibility,
  setWidgetVisibility,
} from '@/lib/dashboardWidgets';

export async function GET() {
  const visibility = await getWidgetVisibility();
  return NextResponse.json({ widgets: DASHBOARD_WIDGETS, visibility });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('visibility' in body)) {
    return NextResponse.json({ error: 'Missing visibility' }, { status: 400 });
  }
  const map = (body as { visibility: Record<string, unknown> }).visibility;
  const sanitized: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(map)) {
    sanitized[k] = Boolean(v);
  }
  await setWidgetVisibility(sanitized);
  return NextResponse.json({ ok: true });
}
