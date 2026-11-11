import { NextRequest, NextResponse } from 'next/server';
import { deleteEmailRule } from '@/lib/emailRules';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteEmailRule(id);
  return NextResponse.json({ ok: true });
}
