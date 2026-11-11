import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const repo = await prisma.taskRepo.findUnique({ where: { taskId: id } });
  return NextResponse.json({ repo });
}

export async function PUT(
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

  const repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim() : '';
  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }

  const branch = typeof body.branch === 'string' && body.branch.trim() ? body.branch.trim() : null;
  const localPath = typeof body.localPath === 'string' && body.localPath.trim() ? body.localPath.trim() : null;
  const defaultInstruction =
    typeof body.defaultInstruction === 'string' && body.defaultInstruction.trim()
      ? body.defaultInstruction.trim()
      : null;

  const repo = await prisma.taskRepo.upsert({
    where: { taskId: id },
    create: { taskId: id, repoUrl, branch, localPath, defaultInstruction },
    update: { repoUrl, branch, localPath, defaultInstruction },
  });
  return NextResponse.json({ repo });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.taskRepo.deleteMany({ where: { taskId: id } });
  return NextResponse.json({ ok: true });
}
