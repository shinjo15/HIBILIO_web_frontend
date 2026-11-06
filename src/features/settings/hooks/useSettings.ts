import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountUnauthorizedError, accountService } from '../../account/services/accountService';
import { clearAuthenticated } from '../../auth/services/authSession';
import type { Settings } from '../domain/settings';
import { AccountVisibilityUnauthorizedError, accountVisibilityService, getInFlightAccountVisibilityUpdate } from '../services/accountVisibilityService';
import { settingsDummyAdapter, type SettingsDummyAdapter } from '../services/settingsDummyAdapter';

export function useSettings(adapter: SettingsDummyAdapter = settingsDummyAdapter) {
  const [settings, setSettings] = useState<Settings>(() => adapter.load());
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isVisibilitySaving, setIsVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState(false);
  const [visibilityLoadError, setVisibilityLoadError] = useState(false);
  const [visibilityReload, setVisibilityReload] = useState(0);
  const isMounted = useRef(true);
  const syncGeneration = useRef(0);

  const updateSettings = useCallback((update: Partial<Settings>) => {
    setSettings((currentSettings) => {
      const nextSettings = { ...currentSettings, ...update };
      adapter.save(nextSettings);
      return nextSettings;
    });
  }, [adapter]);

  const synchronizeVisibility = useCallback(async (): Promise<boolean> => {
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    setIsVisibilityLoading(true);
    setVisibilityError(false);
    setVisibilityLoadError(false);

    const isCurrent = () => isMounted.current && generation === syncGeneration.current;

    try {
      const inFlightUpdate = getInFlightAccountVisibilityUpdate();
      if (inFlightUpdate !== null) await inFlightUpdate.catch(() => undefined);

      const profile = await accountService.getProfile();
      if (profile === null) throw new Error('Account visibility is unavailable');
      if (!isCurrent()) return false;

      updateSettings({ isPrivateAccount: profile.visibility === 'private' });
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      if (error instanceof AccountUnauthorizedError || error instanceof AccountVisibilityUnauthorizedError) {
        clearAuthenticated();
        return false;
      }

      setVisibilityError(true);
      setVisibilityLoadError(true);
      return false;
    } finally {
      if (isCurrent()) setIsVisibilityLoading(false);
    }
  }, [updateSettings]);

  useEffect(() => {
    isMounted.current = true;
    let active = true;
    void Promise.resolve().then(() => active ? synchronizeVisibility() : undefined);

    return () => {
      active = false;
      isMounted.current = false;
      syncGeneration.current += 1;
    };
  }, [synchronizeVisibility, visibilityReload]);

  async function togglePrivateAccount() {
    if (isVisibilityLoading || isVisibilitySaving || visibilityLoadError) return;

    const isPrivateAccount = !settings.isPrivateAccount;
    setIsVisibilitySaving(true);

    try {
      await accountVisibilityService.update(isPrivateAccount ? 'private' : 'public');
    } catch {
      // A failed response does not prove that the server rejected the change.
    } finally {
      if (isMounted.current) {
        await synchronizeVisibility();
        if (isMounted.current) setIsVisibilitySaving(false);
      }
    }
  }

  return {
    isVisibilityLoading,
    isVisibilitySaving,
    settings,
    signOut: adapter.signOut,
    toggleDarkMode: () => updateSettings({ isDarkMode: !settings.isDarkMode }),
    toggleLikeNotification: () => updateSettings({ isLikeNotificationEnabled: !settings.isLikeNotificationEnabled }),
    togglePrivateAccount: () => void togglePrivateAccount(),
    toggleSupportNotification: () => updateSettings({ isSupportNotificationEnabled: !settings.isSupportNotificationEnabled }),
    visibilityError,
    visibilityLoadError,
    retryVisibility: () => setVisibilityReload((currentReload) => currentReload + 1),
  };
}
