import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addComment } from '@/lib/taskRelations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ comments });
}

export async function POST(
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
  if (typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body required' }, { status: 400 });
  }
  const comment = await addComment(id, body.body);
  return NextResponse.json({ comment }, { status: 201 });
}
