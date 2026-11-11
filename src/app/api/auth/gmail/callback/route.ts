import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/integrations/gmail';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url));
  }

  try {
    await handleCallback(code);
    return NextResponse.redirect(new URL('/settings?connected=gmail', request.url));
  } catch {
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url));
  }
}
