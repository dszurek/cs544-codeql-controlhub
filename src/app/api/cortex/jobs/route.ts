import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { isJobType } from '@/lib/cortex/registry';
import { enqueueJob, processQueue } from '@/lib/cortex/runner';

export async function GET() {
  try {
    const jobs = await prisma.aiJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    return NextResponse.json({ jobs });
  } catch (e) {
    console.error('[cortex/jobs]', e);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = typeof body.type === 'string' ? body.type : '';
    if (!isJobType(type)) {
      return NextResponse.json({ error: `Unknown job type: ${type}` }, { status: 400 });
    }
    const { id, deduped } = await enqueueJob(type, body.payload);
    void processQueue(); // kick the runner; response doesn't wait for the job
    return NextResponse.json({ id, deduped, status: 'queued' });
  } catch (e) {
    console.error('[cortex/jobs]', e);
    return NextResponse.json({ error: 'Failed to enqueue job' }, { status: 500 });
  }
}
