import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, createTemplate, type TemplateItem } from '@/lib/taskTemplates';

export async function GET() {
  const templates = await listTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? (body.items as TemplateItem[]) : [];
  const created = await createTemplate({
    name: body.name,
    description: typeof body.description === 'string' ? body.description : undefined,
    items,
  });
  return NextResponse.json({ template: created }, { status: 201 });
}
