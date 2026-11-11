import { NextRequest, NextResponse } from 'next/server';
import {
  listEmailAccounts,
  createEmailAccount,
  countEmailAccounts,
  MAX_ACCOUNTS,
} from '@/lib/emailAccounts';

export async function GET() {
  const accounts = await listEmailAccounts();
  return NextResponse.json({ accounts, max: MAX_ACCOUNTS });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const provider = typeof body.provider === 'string' ? body.provider : null;
  const email = typeof body.email === 'string' ? body.email.trim() : null;
  const label = typeof body.label === 'string' ? body.label.trim() || undefined : undefined;

  if (!provider || (provider !== 'outlook' && provider !== 'gmail')) {
    return NextResponse.json({ error: 'provider must be outlook or gmail' }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const existing = await countEmailAccounts();
  if (existing >= MAX_ACCOUNTS) {
    return NextResponse.json(
      { error: `Cannot exceed ${MAX_ACCOUNTS} accounts` },
      { status: 400 },
    );
  }

  try {
    const account = await createEmailAccount({ provider, email, label });
    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Account with this email already exists for this provider' },
      { status: 409 },
    );
  }
}
