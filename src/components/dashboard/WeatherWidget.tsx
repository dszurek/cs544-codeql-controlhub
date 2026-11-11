'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

interface WeatherPrefs {
  lat: string | null;
  lon: string | null;
  label: string | null;
}

interface WeatherData {
  currentTemp: number;
  currentCode: number;
  hourly: Array<{ time: string; temp: number; code: number }>;
}

function weatherCodeToInfo(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear', emoji: '☀️' };
  if (code <= 3) return { label: 'Partly Cloudy', emoji: '⛅' };
  if (code <= 48) return { label: 'Foggy', emoji: '🌫️' };
  if (code <= 57) return { label: 'Drizzle', emoji: '🌦️' };
  if (code <= 67) return { label: 'Rain', emoji: '🌧️' };
  if (code <= 77) return { label: 'Snow', emoji: '❄️' };
  if (code <= 82) return { label: 'Showers', emoji: '🌦️' };
  if (code <= 86) return { label: 'Snow Showers', emoji: '🌨️' };
  if (code <= 99) return { label: 'Thunderstorm', emoji: '⛈️' };
  return { label: '—', emoji: '🌡️' };
}

function next12Hours(
  hourly: OpenMeteoResponse['hourly']
): Array<{ time: string; temp: number; code: number }> {
  const nowMs = Date.now();
  const result: Array<{ time: string; temp: number; code: number }> = [];
  for (let i = 0; i < hourly.time.length && result.length < 12; i++) {
    const t = new Date(hourly.time[i]).getTime();
    if (t < nowMs - 30 * 60 * 1000) continue;
    result.push({ time: hourly.time[i], temp: hourly.temperature_2m[i], code: hourly.weather_code[i] });
  }
  return result;
}

const hourlyStripStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  overflowX: 'auto',
  marginTop: '1rem',
  paddingBottom: '0.25rem',
};

const hourItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
  minWidth: '3rem',
  fontSize: '0.75rem',
  color: 'var(--beige)',
};

export function WeatherWidget() {
  const [prefs, setPrefs] = useState<WeatherPrefs | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function getBrowserLocation(): Promise<{ lat: string; lon: string } | null> {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: String(pos.coords.latitude),
              lon: String(pos.coords.longitude),
            }),
          () => resolve(null),
          { timeout: 5000, maximumAge: 5 * 60 * 1000 },
        );
      });
    }

    async function getIpLocation(): Promise<{ lat: string; lon: string; label: string } | null> {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) return null;
        const j = await res.json();
        if (typeof j.latitude !== 'number' || typeof j.longitude !== 'number') return null;
        const label = [j.city, j.region].filter(Boolean).join(', ') || null;
        return { lat: String(j.latitude), lon: String(j.longitude), label: label ?? '' };
      } catch {
        return null;
      }
    }

    async function loadWeather() {
      setLoading(true);
      setError(null);

      try {
        const prefRes = await fetch('/api/preferences');
        if (!prefRes.ok) throw new Error('Failed to load preferences');
        const prefData = await prefRes.json();
        const storedPrefs: WeatherPrefs = prefData.weather;

        // Prefer browser geolocation; then IP-based; finally stored settings for the Pi kiosk.
        let weatherPrefs: WeatherPrefs;
        const browserLoc = await getBrowserLocation();
        if (browserLoc) {
          weatherPrefs = {
            lat: browserLoc.lat,
            lon: browserLoc.lon,
            label: storedPrefs.label ?? null,
          };
        } else {
          const ipLoc = await getIpLocation();
          if (ipLoc) {
            weatherPrefs = {
              lat: ipLoc.lat,
              lon: ipLoc.lon,
              label: storedPrefs.label ?? ipLoc.label ?? null,
            };
          } else {
            weatherPrefs = storedPrefs;
          }
        }

        if (cancelled) return;
        setPrefs(weatherPrefs);

        if (!weatherPrefs.lat || !weatherPrefs.lon) {
          setLoading(false);
          return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherPrefs.lat}&longitude=${weatherPrefs.lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
        const weatherRes = await fetch(url);
        if (!weatherRes.ok) throw new Error('Failed to load weather');
        const data: OpenMeteoResponse = await weatherRes.json();

        if (cancelled) return;
        setWeather({
          currentTemp: data.current.temperature_2m,
          currentCode: data.current.weather_code,
          hourly: next12Hours(data.hourly),
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWeather();

    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <GlassCard>
        <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading…</p>
      </GlassCard>
    );
  }

  if (prefs && !prefs.lat && !prefs.lon) {
    return (
      <GlassCard>
        <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '0.875rem' }}>
          Set weather location in Settings
        </p>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <p style={{ color: '#dc3545', fontSize: '0.875rem' }}>{error}</p>
      </GlassCard>
    );
  }

  if (!weather) return null;

  const { label, emoji } = weatherCodeToInfo(weather.currentCode);

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            fontSize: '2.5rem',
            fontFamily: 'var(--font-playfair)',
            color: 'var(--beige-light)',
            lineHeight: 1,
          }}
        >
          {Math.round(weather.currentTemp)}°F
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{emoji}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--leather-light)', marginTop: '0.25rem' }}>
            {label}
          </div>
          {prefs?.label && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              {prefs.label}
            </div>
          )}
        </div>
      </div>

      <div style={hourlyStripStyle}>
        {weather.hourly.map((h) => {
          const hourInfo = weatherCodeToInfo(h.code);
          const hourLabel = new Date(h.time).toLocaleTimeString([], {
            hour: 'numeric',
          });
          return (
            <div key={h.time} style={hourItemStyle}>
              <span>{hourLabel}</span>
              <span>{hourInfo.emoji}</span>
              <span>{Math.round(h.temp)}°</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
