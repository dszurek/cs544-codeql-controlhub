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
  if (!map || typeof map !== 'object') {
    return NextResponse.json({ error: 'visibility must be an object' }, { status: 400 });
  }
  // Only copy keys that are known widget IDs. Iterating over the server-side
  // allow-list (instead of the client's keys) means a request body such as
  // {"visibility": {"__proto__": ...}} can never become a property name.
  const sanitized: Record<string, boolean> = {};
  for (const widget of DASHBOARD_WIDGETS) {
    if (Object.prototype.hasOwnProperty.call(map, widget.id)) {
      sanitized[widget.id] = Boolean(map[widget.id]);
    }
  }
  await setWidgetVisibility(sanitized);
  return NextResponse.json({ ok: true });
}
