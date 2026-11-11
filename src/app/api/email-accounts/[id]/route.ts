import { NextRequest, NextResponse } from 'next/server';
import { updateEmailAccount, deleteEmailAccount } from '@/lib/emailAccounts';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: Parameters<typeof updateEmailAccount>[1] = {};
  if (typeof body.label === 'string') data.label = body.label.trim() || null;
  if (body.label === null) data.label = null;
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;

  try {
    const account = await updateEmailAccount(id, data);
    return NextResponse.json({ account });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteEmailAccount(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
