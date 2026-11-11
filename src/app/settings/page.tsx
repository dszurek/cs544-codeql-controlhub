import { getSettings } from '@/lib/settings';
import { getLastSyncStatus } from '@/lib/syncLog';
import { getConfiguredScenes } from '@/lib/integrations/homeassistant';
import { SettingsForm } from './SettingsForm';

const SETTING_KEYS = [
  'ha_url',
  'ha_token',
  'icloud_email',
  'icloud_apple_id',
  'icloud_app_password',
  'icloud_blackboard_calendar',
  'outlook_client_id',
  'outlook_client_secret',
  'outlook_redirect_uri',
  'gmail_client_id',
  'gmail_client_secret',
  'gmail_redirect_uri',
  'sync_interval_email',
  'sync_interval_calendar',
  'sync_interval_tasks',
  'weather_lat',
  'weather_lon',
  'weather_label',
  'github_token',
  'github_user',
];

export default async function SettingsPage() {
  const settings = await getSettings(SETTING_KEYS);
  const syncStatus = await getLastSyncStatus(['outlook', 'gmail', 'icloud']);
  const scenes = await getConfiguredScenes();
  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'var(--font-playfair)', marginBottom: '1.5rem', color: 'var(--beige-light)' }}>
        Settings
      </h1>
      <SettingsForm initialValues={settings} syncStatus={syncStatus} configuredScenes={scenes} />
    </div>
  );
}
