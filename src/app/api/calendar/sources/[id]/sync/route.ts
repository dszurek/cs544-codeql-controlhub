import { NextRequest, NextResponse } from 'next/server';
import { syncIcsSource } from '@/lib/integrations/ics';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await syncIcsSource(id);
  if (result.error) {
    return NextResponse.json({ ...result, ok: false }, { status: 400 });
  }
  return NextResponse.json({ ...result, ok: true });
}
