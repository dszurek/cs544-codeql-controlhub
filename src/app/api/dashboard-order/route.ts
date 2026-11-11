import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DASHBOARD_WIDGETS, getWidgetOrder, setWidgetOrder } from '@/lib/dashboardWidgets';

export async function GET() {
  try {
    return NextResponse.json({ widgets: DASHBOARD_WIDGETS, order: await getWidgetOrder() });
  } catch (e) {
    console.error('[dashboard-order]', e);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: 'order array required' }, { status: 400 });
    }
    await setWidgetOrder(body.order);
    return NextResponse.json({ order: await getWidgetOrder() });
  } catch (e) {
    console.error('[dashboard-order]', e);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}
