import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const signals = await prisma.signal.findMany({
      where: { dismissedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ signals });
  } catch (e) {
    console.error('[signals]', e);
    return NextResponse.json({ error: 'Failed to load signals' }, { status: 500 });
  }
}
