import { NextRequest, NextResponse } from 'next/server';
import { getEmailsForEvent } from '@/lib/emailEventLinks';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const emails = await getEmailsForEvent(id);
  return NextResponse.json({ emails });
}
