import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/** Full job including the diff (for the review card). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.forgeJob.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    console.error('[forge/get]', e);
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
  }
}
