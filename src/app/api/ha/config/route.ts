import { NextResponse } from 'next/server';
import { getHaConfig } from '@/lib/integrations/homeassistant';

// NOTE: This endpoint exposes HA credentials (URL + long-lived token).
// This is intentional for this personal single-user app running on Tailscale,
// where the dashboard is not publicly accessible.
export async function GET() {
  const config = await getHaConfig();
  if (!config) {
    return NextResponse.json({ url: null, token: null });
  }
  return NextResponse.json({ url: config.url, token: config.token });
}
