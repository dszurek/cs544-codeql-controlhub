import { NextRequest, NextResponse } from 'next/server';
import { callService } from '@/lib/integrations/homeassistant';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { domain, service, serviceData } = body;

  if (!domain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }
  if (!service) {
    return NextResponse.json({ error: 'service is required' }, { status: 400 });
  }

  try {
    await callService(
      String(domain),
      String(service),
      serviceData as Record<string, unknown> | undefined,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 502 });
  }
}
