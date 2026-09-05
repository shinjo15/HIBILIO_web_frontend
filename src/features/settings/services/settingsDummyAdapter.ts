import { defaultSettings, type Settings } from '../domain/settings';

export type SettingsDummyAdapter = {
  load(): Settings;
  save(settings: Settings): void;
  signOut(): void;
};

/**
 * Settings APIs are not available yet. This adapter intentionally keeps all
 * changes local to the settings screen and makes no HTTP requests.
 */
export const settingsDummyAdapter: SettingsDummyAdapter = {
  load: () => defaultSettings,
  save: () => undefined,
  signOut: () => undefined,
};
