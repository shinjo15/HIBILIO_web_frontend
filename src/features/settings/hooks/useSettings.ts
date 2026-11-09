import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountUnauthorizedError, accountService } from '../../account/services/accountService';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus } from '../../auth/services/authSession';
import type { Settings } from '../domain/settings';
import { AccountVisibilityUnauthorizedError, accountVisibilityService, getInFlightAccountVisibilityUpdate } from '../services/accountVisibilityService';
import { getInFlightLikeNotificationUpdate, LikeNotificationUnauthorizedError, likeNotificationService } from '../services/likeNotificationService';
import { getInFlightSupportNotificationUpdate, SupportNotificationUnauthorizedError, supportNotificationService } from '../services/supportNotificationService';
import { settingsDummyAdapter, type SettingsDummyAdapter } from '../services/settingsDummyAdapter';

export function useSettings(adapter: SettingsDummyAdapter = settingsDummyAdapter) {
  const [settings, setSettings] = useState<Settings>(() => adapter.load());
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isVisibilitySaving, setIsVisibilitySaving] = useState(false);
  const [isLikeNotificationSaving, setIsLikeNotificationSaving] = useState(false);
  const [isSupportNotificationSaving, setIsSupportNotificationSaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState(false);
  const [visibilityLoadError, setVisibilityLoadError] = useState(false);
  const [visibilityReload, setVisibilityReload] = useState(0);
  const [notificationStatus, setNotificationStatus] = useState<'error' | 'loading' | 'ready'>('loading');
  const [notificationAuthenticationFailed, setNotificationAuthenticationFailed] = useState(false);
  const [likeNotificationError, setLikeNotificationError] = useState(false);
  const [supportNotificationError, setSupportNotificationError] = useState(false);
  const isMounted = useRef(true);
  const syncGeneration = useRef(0);
  const likeNotificationRetryValue = useRef<boolean | null>(null);
  const supportNotificationRetryValue = useRef<boolean | null>(null);

  const updateSettings = useCallback((update: Partial<Settings>) => {
    setSettings((currentSettings) => {
      const nextSettings = { ...currentSettings, ...update };
      adapter.save(nextSettings);
      return nextSettings;
    });
  }, [adapter]);

  const synchronizeSettings = useCallback(async (preserveLikeError = false): Promise<boolean> => {
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    setIsVisibilityLoading(true);
    setVisibilityError(false);
    setVisibilityLoadError(false);
    setNotificationStatus('loading');
    if (!preserveLikeError) setLikeNotificationError(false);
    const sessionGeneration = getAuthenticationGeneration();
    const isCurrent = () => isMounted.current && sessionGeneration === getAuthenticationGeneration() && generation === syncGeneration.current;

    try {
      const inFlightVisibilityUpdate = getInFlightAccountVisibilityUpdate(sessionGeneration);
      const inFlightLikeUpdate = getInFlightLikeNotificationUpdate(sessionGeneration);
      const inFlightSupportUpdate = getInFlightSupportNotificationUpdate(sessionGeneration);
      await Promise.all([
        inFlightVisibilityUpdate?.catch(() => undefined),
        inFlightLikeUpdate?.catch(() => undefined),
        inFlightSupportUpdate?.catch(() => undefined),
      ]);

      const getMySettings = accountService.getMySettings;
      if (getMySettings === undefined) throw new Error('Account settings are unavailable');
      const loadedSettings = await getMySettings();
      if (!isCurrent()) return false;

      updateSettings({ isPrivateAccount: loadedSettings.isPrivateAccount });
      if (loadedSettings.notificationSettings === null) {
        setNotificationStatus('error');
      } else {
        updateSettings(loadedSettings.notificationSettings);
        setNotificationStatus('ready');
      }
      return true;
    } catch (error) {
      if (!isCurrent() && getAuthenticationStatus() !== 'unauthenticated') return false;
      if (error instanceof AccountUnauthorizedError || error instanceof AccountVisibilityUnauthorizedError || error instanceof LikeNotificationUnauthorizedError || error instanceof SupportNotificationUnauthorizedError) clearAuthenticated();
      setNotificationStatus('error');
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
    void Promise.resolve().then(() => active ? synchronizeSettings() : undefined);

    return () => {
      active = false;
      isMounted.current = false;
      syncGeneration.current += 1;
    };
  }, [synchronizeSettings, visibilityReload]);

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
        await synchronizeSettings();
        if (isMounted.current) setIsVisibilitySaving(false);
      }
    }
  }

  async function saveLikeNotification(enabled: boolean) {
    if (isLikeNotificationSaving || notificationStatus !== 'ready') return;
    setIsLikeNotificationSaving(true);
    setLikeNotificationError(false);
    likeNotificationRetryValue.current = enabled;
    let unauthorized = false;

    try {
      await likeNotificationService.update(enabled);
      likeNotificationRetryValue.current = null;
    } catch (error) {
      if (error instanceof LikeNotificationUnauthorizedError) {
        unauthorized = true;
        clearAuthenticated();
        if (isMounted.current) setNotificationAuthenticationFailed(true);
      }
      if (isMounted.current) setLikeNotificationError(true);
    } finally {
      if (isMounted.current) {
        if (!unauthorized) await synchronizeSettings(likeNotificationRetryValue.current !== null);
        if (isMounted.current) setIsLikeNotificationSaving(false);
      }
    }
  }

  async function saveSupportNotification(enabled: boolean) {
    if (isSupportNotificationSaving || notificationStatus !== 'ready') return;
    setIsSupportNotificationSaving(true);
    setSupportNotificationError(false);
    supportNotificationRetryValue.current = enabled;
    let unauthorized = false;

    try {
      await supportNotificationService.update(enabled);
      supportNotificationRetryValue.current = null;
    } catch (error) {
      if (error instanceof SupportNotificationUnauthorizedError) {
        unauthorized = true;
        clearAuthenticated();
        if (isMounted.current) setNotificationAuthenticationFailed(true);
      }
      if (isMounted.current) setSupportNotificationError(true);
    } finally {
      if (isMounted.current) {
        if (!unauthorized) await synchronizeSettings(supportNotificationRetryValue.current !== null);
        if (isMounted.current) setIsSupportNotificationSaving(false);
      }
    }
  }

  return {
    isVisibilityLoading,
    isVisibilitySaving,
    isLikeNotificationSaving,
    isSupportNotificationSaving,
    likeNotificationError,
    notificationAuthenticationFailed,
    notificationStatus,
    retryLikeNotification: () => {
      const retryValue = likeNotificationRetryValue.current;
      if (retryValue !== null) void saveLikeNotification(retryValue);
    },
    retrySupportNotification: () => {
      const retryValue = supportNotificationRetryValue.current;
      if (retryValue !== null) void saveSupportNotification(retryValue);
    },
    retryNotifications: () => setVisibilityReload((currentReload) => currentReload + 1),
    settings,
    signOut: adapter.signOut,
    toggleDarkMode: () => updateSettings({ isDarkMode: !settings.isDarkMode }),
    toggleLikeNotification: () => void saveLikeNotification(!settings.isLikeNotificationEnabled),
    toggleSupportNotification: () => void saveSupportNotification(!settings.isSupportNotificationEnabled),
    supportNotificationError,
    togglePrivateAccount: () => void togglePrivateAccount(),
    visibilityError,
    visibilityLoadError,
    retryVisibility: () => setVisibilityReload((currentReload) => currentReload + 1),
  };
}
