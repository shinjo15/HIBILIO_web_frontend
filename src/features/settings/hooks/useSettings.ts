import { useState } from 'react';
import type { Settings } from '../domain/settings';
import { settingsDummyAdapter, type SettingsDummyAdapter } from '../services/settingsDummyAdapter';

export function useSettings(adapter: SettingsDummyAdapter = settingsDummyAdapter) {
  const [settings, setSettings] = useState<Settings>(() => adapter.load());

  function updateSettings(update: Partial<Settings>) {
    setSettings((currentSettings) => {
      const nextSettings = { ...currentSettings, ...update };
      adapter.save(nextSettings);
      return nextSettings;
    });
  }

  return {
    settings,
    signOut: adapter.signOut,
    toggleDarkMode: () => updateSettings({ isDarkMode: !settings.isDarkMode }),
    toggleLikeNotification: () => updateSettings({ isLikeNotificationEnabled: !settings.isLikeNotificationEnabled }),
    togglePrivateAccount: () => updateSettings({ isPrivateAccount: !settings.isPrivateAccount }),
    toggleSupportNotification: () => updateSettings({ isSupportNotificationEnabled: !settings.isSupportNotificationEnabled }),
  };
}
