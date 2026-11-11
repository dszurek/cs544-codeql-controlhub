import { NextRequest, NextResponse } from 'next/server';
import { removeScene } from '@/lib/integrations/homeassistant';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeScene(id);
  return NextResponse.json({ ok: true });
}
