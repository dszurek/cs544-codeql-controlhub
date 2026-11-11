'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AppearancePanel } from '@/components/settings/AppearancePanel';
import { DashboardLayoutManager } from '@/components/settings/DashboardLayoutManager';
import {
  SettingField,
  buttonStyle,
  idleSection,
  type SectionState,
  type ConfiguredScene,
} from '@/components/settings/shared';
import { EmailRulesManager } from '@/components/settings/EmailRulesManager';
import { TaskTemplatesManager } from '@/components/settings/TaskTemplatesManager';
import { EmailAccountsManager } from '@/components/settings/EmailAccountsManager';
import { CalendarSourcesManager } from '@/components/settings/CalendarSourcesManager';
import { DashboardWidgetsManager } from '@/components/settings/DashboardWidgetsManager';
import { ScenesManager } from '@/components/settings/ScenesManager';

interface SettingsFormProps {
  initialValues: Record<string, string | null>;
  syncStatus: Record<string, { source: string; syncedAt: Date; status: string; error: string | null } | null>;
  configuredScenes: ConfiguredScene[];
}

/** Per-section save/error feedback line. Hoisted to module scope so it
 *  isn't recreated on every SettingsForm render. */
function SectionFooter({ state }: { state: SectionState }) {
  if (state.error) return <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem' }}>{state.error}</p>;
  if (state.saved) return <p style={{ fontSize: '0.75rem', color: 'var(--forest-light)', marginTop: '0.5rem' }}>Saved successfully</p>;
  return null;
}

function SyncStatusDisplay({
  status,
}: {
  status: { source: string; syncedAt: Date; status: string; error: string | null } | null;
}) {
  if (!status) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Never synced</p>;
  }
  const time = new Date(status.syncedAt).toLocaleString();
  if (status.status === 'success') {
    return <p style={{ color: '#28a745', fontSize: '0.75rem', marginTop: '0.5rem' }}>Last synced: {time}</p>;
  }
  return (
    <p style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '0.5rem' }}>
      Sync error at {time}: {status.error}
    </p>
  );
}

function SyncNowButton({ source }: { source: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSync() {
    setState('loading');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <button
      onClick={handleSync}
      disabled={state === 'loading'}
      style={{
        padding: '0.4375rem 1rem',
        background: 'rgba(176, 122, 79,0.25)',
        border: '1px solid rgba(176, 122, 79,0.4)',
        borderRadius: '6px',
        color: state === 'done' ? '#28a745' : state === 'error' ? '#dc3545' : 'var(--leather-light)',
        fontSize: '0.8125rem',
        cursor: state === 'loading' ? 'not-allowed' : 'pointer',
      }}
    >
      {state === 'loading' ? 'Syncing…' : state === 'done' ? 'Synced!' : state === 'error' ? 'Error' : 'Sync Now'}
    </button>
  );
}

function TestHaConnectionButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleTest() {
    setState('loading');
    try {
      const res = await fetch('/api/ha/states');
      if (res.ok) {
        setState('ok');
        setErrorMsg(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setState('error');
        setErrorMsg((body as { error?: string }).error ?? 'Connection failed');
      }
    } catch (err) {
      setState('error');
      setErrorMsg((err as Error).message);
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <button
        onClick={handleTest}
        disabled={state === 'loading'}
        style={{
          padding: '0.4375rem 1rem',
          background: 'rgba(45,74,62,0.25)',
          border: '1px solid rgba(45,74,62,0.4)',
          borderRadius: '6px',
          color:
            state === 'ok' ? '#28a745' :
            state === 'error' ? '#dc3545' :
            'var(--leather-light)',
          fontSize: '0.8125rem',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {state === 'loading' ? 'Testing…' :
         state === 'ok' ? 'Connected!' :
         state === 'error' ? 'Failed' :
         'Test Connection'}
      </button>
      {state === 'error' && errorMsg && (
        <p style={{ color: '#dc3545', fontSize: '0.6875rem', margin: 0 }}>{errorMsg}</p>
      )}
    </div>
  );
}

export function SettingsForm({ initialValues, syncStatus, configuredScenes }: SettingsFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialValues).map(([k, v]) => [k, v ?? ''])
    )
  );
  const [sections, setSections] = useState<Record<string, SectionState>>({});

  function sectionState(id: string): SectionState {
    return sections[id] ?? idleSection;
  }

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(sectionId: string, keys: string[]) {
    setSections((prev) => ({ ...prev, [sectionId]: { saving: true, saved: false, error: null } }));
    try {
      const results = await Promise.all(
        keys.map((key) =>
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: values[key] ?? '' }),
          })
        )
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        setSections((prev) => ({ ...prev, [sectionId]: { saving: false, saved: false, error: 'Save failed. Please try again.' } }));
      } else {
        setSections((prev) => ({ ...prev, [sectionId]: { saving: false, saved: true, error: null } }));
      }
    } catch {
      setSections((prev) => ({ ...prev, [sectionId]: { saving: false, saved: false, error: 'Network error. Please try again.' } }));
    }
  }

  const sectionStyle = { marginBottom: '1.5rem' };
  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-playfair)',
    fontSize: '1rem',
    color: 'var(--beige-light)',
    marginBottom: '0.75rem',
  };

  return (
    <div>
      {/* Home Assistant */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Home Assistant</h2>
          <SettingField label="HA URL" name="ha_url" value={values.ha_url ?? ''} onChange={handleChange} placeholder="http://homeassistant.local:8123" />
          <SettingField label="Long-Lived Access Token" name="ha_token" value={values.ha_token ?? ''} onChange={handleChange} type="password" placeholder="eyJ..." />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={() => handleSave('ha', ['ha_url', 'ha_token'])} disabled={sectionState('ha').saving} style={buttonStyle}>
              {sectionState('ha').saving ? 'Saving…' : 'Save'}
            </button>
            <TestHaConnectionButton />
          </div>
          <SectionFooter state={sectionState('ha')} />
        </GlassCard>
      </div>

      {/* Outlook */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Outlook / Microsoft 365</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Register an app at portal.azure.com and enter the credentials below.
          </p>
          <SettingField label="Client ID" name="outlook_client_id" value={values.outlook_client_id ?? ''} onChange={handleChange} />
          <SettingField label="Client Secret" name="outlook_client_secret" value={values.outlook_client_secret ?? ''} onChange={handleChange} type="password" />
          <SettingField label="Redirect URI" name="outlook_redirect_uri" value={values.outlook_redirect_uri ?? ''} onChange={handleChange} placeholder="http://localhost:3000/api/auth/outlook/callback" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.25rem' }}>
            <button onClick={() => handleSave('outlook_extended', ['outlook_client_id', 'outlook_client_secret', 'outlook_redirect_uri'])} disabled={sectionState('outlook_extended').saving} style={buttonStyle}>
              {sectionState('outlook_extended').saving ? 'Saving…' : 'Save'}
            </button>
            <a
              href="/api/auth/outlook"
              style={{
                display: 'inline-block',
                padding: '0.4375rem 1rem',
                background: '#0078d4',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Connect Outlook
            </a>
            <SyncNowButton source="outlook" />
          </div>
          <SectionFooter state={sectionState('outlook_extended')} />
          <SyncStatusDisplay status={syncStatus['outlook']} />
        </GlassCard>
      </div>

      {/* Gmail */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Gmail</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Create credentials at console.cloud.google.com.
          </p>
          <SettingField label="Client ID" name="gmail_client_id" value={values.gmail_client_id ?? ''} onChange={handleChange} />
          <SettingField label="Client Secret" name="gmail_client_secret" value={values.gmail_client_secret ?? ''} onChange={handleChange} type="password" />
          <SettingField label="Redirect URI" name="gmail_redirect_uri" value={values.gmail_redirect_uri ?? ''} onChange={handleChange} placeholder="http://localhost:3000/api/auth/gmail/callback" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.25rem' }}>
            <button onClick={() => handleSave('gmail_extended', ['gmail_client_id', 'gmail_client_secret', 'gmail_redirect_uri'])} disabled={sectionState('gmail_extended').saving} style={buttonStyle}>
              {sectionState('gmail_extended').saving ? 'Saving…' : 'Save'}
            </button>
            <a
              href="/api/auth/gmail"
              style={{
                display: 'inline-block',
                padding: '0.4375rem 1rem',
                background: '#ea4335',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.8125rem',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Connect Gmail
            </a>
            <SyncNowButton source="gmail" />
          </div>
          <SectionFooter state={sectionState('gmail_extended')} />
          <SyncStatusDisplay status={syncStatus['gmail']} />
        </GlassCard>
      </div>

      {/* iCloud Calendar */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>iCloud Calendar</h2>
          <SettingField label="Apple ID" name="icloud_apple_id" value={values.icloud_apple_id ?? ''} onChange={handleChange} placeholder="yourname@icloud.com" />
          <SettingField label="App-Specific Password" name="icloud_app_password" value={values.icloud_app_password ?? ''} onChange={handleChange} type="password" />
          <SettingField label="Blackboard Calendar Name" name="icloud_blackboard_calendar" value={values.icloud_blackboard_calendar ?? ''} onChange={handleChange} placeholder="Blackboard" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.25rem' }}>
            <button onClick={() => handleSave('icloud_extended', ['icloud_apple_id', 'icloud_app_password', 'icloud_blackboard_calendar'])} disabled={sectionState('icloud_extended').saving} style={buttonStyle}>
              {sectionState('icloud_extended').saving ? 'Saving…' : 'Save'}
            </button>
            <SyncNowButton source="icloud" />
          </div>
          <SectionFooter state={sectionState('icloud_extended')} />
          <SyncStatusDisplay status={syncStatus['icloud']} />
        </GlassCard>
      </div>

      {/* Sync intervals */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Sync Intervals (minutes)</h2>
          <SettingField label="Email sync interval" name="sync_interval_email" value={values.sync_interval_email ?? '10'} onChange={handleChange} placeholder="10" />
          <SettingField label="Calendar sync interval" name="sync_interval_calendar" value={values.sync_interval_calendar ?? '10'} onChange={handleChange} placeholder="10" />
          <SettingField label="Task import interval" name="sync_interval_tasks" value={values.sync_interval_tasks ?? '30'} onChange={handleChange} placeholder="30" />
          <button onClick={() => handleSave('sync', ['sync_interval_email', 'sync_interval_calendar', 'sync_interval_tasks'])} disabled={sectionState('sync').saving} style={buttonStyle}>
            {sectionState('sync').saving ? 'Saving…' : 'Save'}
          </button>
          <SectionFooter state={sectionState('sync')} />
        </GlassCard>
      </div>

      {/* Weather Location */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Weather Location</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Latitude/longitude for Open-Meteo weather data. Label is shown in the widget.
          </p>
          <SettingField label="Latitude" name="weather_lat" value={values.weather_lat ?? ''} onChange={handleChange} placeholder="40.7128" />
          <SettingField label="Longitude" name="weather_lon" value={values.weather_lon ?? ''} onChange={handleChange} placeholder="-74.0060" />
          <SettingField label="Label" name="weather_label" value={values.weather_label ?? ''} onChange={handleChange} placeholder="New York, NY" />
          <button onClick={() => handleSave('weather', ['weather_lat', 'weather_lon', 'weather_label'])} disabled={sectionState('weather').saving} style={buttonStyle}>
            {sectionState('weather').saving ? 'Saving…' : 'Save'}
          </button>
          <SectionFooter state={sectionState('weather')} />
        </GlassCard>
      </div>

      {/* GitHub */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>GitHub</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Create a personal access token at github.com/settings/tokens (classic or fine-grained, needs <code>repo</code> and <code>read:user</code>).
          </p>
          <SettingField label="Username" name="github_user" value={values.github_user ?? ''} onChange={handleChange} placeholder="octocat" />
          <SettingField label="Personal Access Token" name="github_token" value={values.github_token ?? ''} onChange={handleChange} type="password" placeholder="ghp_..." />
          <button onClick={() => handleSave('github', ['github_user', 'github_token'])} disabled={sectionState('github').saving} style={buttonStyle}>
            {sectionState('github').saving ? 'Saving…' : 'Save'}
          </button>
          <SectionFooter state={sectionState('github')} />
        </GlassCard>
      </div>

      {/* Email Accounts */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Email Accounts</h2>
          <EmailAccountsManager />
        </GlassCard>
      </div>

      {/* Calendar Sources */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Calendar Subscriptions</h2>
          <CalendarSourcesManager />
        </GlassCard>
      </div>

      {/* Task Templates */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Task Templates</h2>
          <TaskTemplatesManager />
        </GlassCard>
      </div>

      {/* Appearance */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Appearance</h2>
          <AppearancePanel />
        </GlassCard>
      </div>

      {/* Dashboard Widgets */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Dashboard Widgets</h2>
          <DashboardWidgetsManager />
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(216, 204, 192,0.1)', paddingTop: '1.25rem' }}>
            <DashboardLayoutManager />
          </div>
        </GlassCard>
      </div>

      {/* Email Rules */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Email Rules</h2>
          <EmailRulesManager />
        </GlassCard>
      </div>

      {/* Smart Home Scenes */}
      <div style={sectionStyle}>
        <GlassCard>
          <h2 style={headingStyle}>Smart Home Scenes</h2>
          <ScenesManager initialScenes={configuredScenes} />
        </GlassCard>
      </div>
    </div>
  );
}
