import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

export async function GET() {
  const settings = await getSettings(['weather_lat', 'weather_lon', 'weather_label']);
  return NextResponse.json({
    weather: {
      lat: settings.weather_lat,
      lon: settings.weather_lon,
      label: settings.weather_label,
    },
  });
}
