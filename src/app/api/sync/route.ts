import { NextRequest, NextResponse } from 'next/server';

const VALID_SOURCES = ['outlook', 'gmail', 'icloud', 'ics'] as const;
type SyncSource = (typeof VALID_SOURCES)[number];

function triggerSync(source: SyncSource) {
  if (source === 'outlook') {
    import('@/lib/integrations/outlook').then((m) => m.sync()).catch(() => {});
  } else if (source === 'gmail') {
    import('@/lib/integrations/gmail').then((m) => m.sync()).catch(() => {});
  } else if (source === 'icloud') {
    import('@/lib/integrations/icloud').then((m) => m.sync()).catch(() => {});
  } else if (source === 'ics') {
    import('@/lib/integrations/ics').then((m) => m.sync()).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { source } = body;

  if (source === 'all') {
    for (const s of VALID_SOURCES) {
      triggerSync(s);
    }
    return NextResponse.json({ ok: true, source: 'all' }, { status: 202 });
  }

  if (!VALID_SOURCES.includes(source as SyncSource)) {
    return NextResponse.json(
      { error: `source must be one of: ${VALID_SOURCES.join(', ')}, all` },
      { status: 400 },
    );
  }

  triggerSync(source as SyncSource);
  return NextResponse.json({ ok: true, source }, { status: 202 });
}
