import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueForge, processForgeQueue, isForgeEnabled } from '@/lib/forge/runner';

export async function GET() {
  try {
    const jobs = await prisma.forgeJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      // diff can be large — omit from the list view
      select: {
        id: true, request: true, status: true, branch: true, summary: true,
        filesChanged: true, testsPassed: true, error: true, createdAt: true, finishedAt: true,
      },
    });
    return NextResponse.json({ jobs, enabled: await isForgeEnabled() });
  } catch (e) {
    console.error('[forge]', e);
    return NextResponse.json({ error: 'Failed to load Forge jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isForgeEnabled())) {
      return NextResponse.json({ error: 'Forge is disabled' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const req = typeof body.request === 'string' ? body.request.trim() : '';
    if (req.length < 5) {
      return NextResponse.json({ error: 'Describe the change you want (a sentence or two)' }, { status: 400 });
    }
    const { id } = await enqueueForge(req);
    void processForgeQueue(); // runs in the background; response returns immediately
    return NextResponse.json({ id, status: 'queued' });
  } catch (e) {
    console.error('[forge]', e);
    return NextResponse.json({ error: 'Failed to enqueue change' }, { status: 500 });
  }
}
