import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/integrations/gmail';

export async function GET() {
  const url = await buildAuthUrl();
  return NextResponse.redirect(url);
}
