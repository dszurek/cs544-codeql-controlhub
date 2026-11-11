import { NextRequest, NextResponse } from 'next/server';
import { applyTemplate } from '@/lib/taskTemplates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }
  try {
    const result = await applyTemplate(id, {
      anchorDate: typeof body.anchorDate === 'string' ? new Date(body.anchorDate) : undefined,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to apply template' },
      { status: 400 },
    );
  }
}
