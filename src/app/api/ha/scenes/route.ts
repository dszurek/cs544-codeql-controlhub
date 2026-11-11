import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredScenes, addScene } from '@/lib/integrations/homeassistant';

export async function GET() {
  const scenes = await getConfiguredScenes();
  return NextResponse.json({ scenes });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { haEntityId, name, icon } = body;

  if (!haEntityId) {
    return NextResponse.json({ error: 'haEntityId is required' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const scene = await addScene({
    haEntityId: String(haEntityId),
    name: String(name),
    icon: typeof icon === 'string' ? icon : undefined,
  });

  return NextResponse.json({ scene }, { status: 201 });
}
