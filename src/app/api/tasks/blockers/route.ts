import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const rows = await prisma.taskBlocker.findMany({
    select: { taskId: true, blockerId: true },
  });
  return NextResponse.json({ blockers: rows });
}
