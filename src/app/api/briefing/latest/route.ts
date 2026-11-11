import { NextResponse } from 'next/server';
import { getLatestBriefing } from '@/lib/briefing';

export async function GET() {
  const briefing = await getLatestBriefing();
  if (!briefing) {
    return NextResponse.json({ briefing: null });
  }
  return NextResponse.json({
    briefing: {
      id: briefing.id,
      summary: briefing.summary,
      priorityTaskIds: JSON.parse(briefing.priorityTasks) as string[],
      priorityEmailIds: JSON.parse(briefing.priorityEmails) as string[],
      model: briefing.model,
      error: briefing.error,
      createdAt: briefing.createdAt,
    },
  });
}
