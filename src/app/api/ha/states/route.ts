import { NextResponse } from 'next/server';
import { getStates } from '@/lib/integrations/homeassistant';

export async function GET() {
  try {
    const states = await getStates();
    return NextResponse.json({ states });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ states: [], error }, { status: 502 });
  }
}
