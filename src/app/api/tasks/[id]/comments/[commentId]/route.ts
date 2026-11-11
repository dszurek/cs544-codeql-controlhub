import { NextRequest, NextResponse } from 'next/server';
import { deleteComment } from '@/lib/taskRelations';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  await deleteComment(commentId);
  return NextResponse.json({ ok: true });
}
