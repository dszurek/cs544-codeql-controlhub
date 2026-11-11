import { NextResponse } from 'next/server';
import { getMailInsights } from '@/lib/emailRules';

export async function GET() {
  const insights = await getMailInsights();
  return NextResponse.json(insights);
}
