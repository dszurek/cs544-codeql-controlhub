import { NextRequest, NextResponse } from 'next/server';
import { updateTemplate, deleteTemplate, type TemplateItem } from '@/lib/taskTemplates';

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
  const patch: Parameters<typeof updateTemplate>[1] = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (body.description === null || typeof body.description === 'string') {
    patch.description = body.description as string | null;
  }
  if (Array.isArray(body.items)) patch.items = body.items as TemplateItem[];
  const template = await updateTemplate(id, patch);
  return NextResponse.json({ template });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
