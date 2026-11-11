import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/integrations/outlook';

export async function GET() {
  const url = await buildAuthUrl();
  return NextResponse.redirect(url);
}
