import { NextRequest, NextResponse } from 'next/server';
import { getEmails, getUnreadCounts } from '@/lib/mail';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const options: Parameters<typeof getEmails>[0] = {};

  const source = sp.get('source');
  if (source) options.source = source;

  const isReadStr = sp.get('isRead');
  if (isReadStr === 'true') options.isRead = true;
  else if (isReadStr === 'false') options.isRead = false;

  const folder = sp.get('folder');
  if (folder === 'spam' || folder === 'inbox') options.folder = folder;

  const [emails, unreadCounts] = await Promise.all([getEmails(options), getUnreadCounts()]);

  return NextResponse.json({ emails, unreadCounts });
}
