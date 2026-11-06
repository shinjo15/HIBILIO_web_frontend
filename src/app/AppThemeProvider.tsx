import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { clearAuthenticated, getAuthenticationStatus, subscribeToAuthentication } from '../features/auth/services/authSession';
import { AppThemeContext, type ThemeMode } from './appThemeContext';
import { getInFlightUiModeUpdate, UiModeUnauthorizedError, uiModeService, type UiMode } from './uiModeService';

type AppThemeProviderProps = {
  children: ReactNode;
};


const palettes = {
  dark: {
    background: '#18130f',
    card: '#231a13',
    divider: '#3a2a1f',
    mutedText: '#8c7b6e',
    primary: '#d97240',
    text: '#f0e8e0',
  },
  light: {
    background: '#f8f5f2',
    card: '#ffffff',
    divider: '#e5ddd6',
    mutedText: '#7a6e66',
    primary: '#c2612a',
    text: '#1c1814',
  },
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);
  const [uiMode, setUiModeState] = useState<UiMode>('system');
  const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [isUiModeLoading, setIsUiModeLoading] = useState(() => getAuthenticationStatus() === 'authenticated');
  const [isUiModeSaving, setIsUiModeSaving] = useState(false);
  const [uiModeError, setUiModeError] = useState(false);
  const syncGeneration = useRef(0);
  const isMounted = useRef(true);
  const themeMode: ThemeMode = uiMode === 'system' ? systemThemeMode : uiMode;
  const palette = palettes[themeMode];

  const synchronizeUiMode = useCallback(async (): Promise<boolean> => {
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    setIsUiModeLoading(true);
    const isCurrent = () => isMounted.current && generation === syncGeneration.current;

    try {
      const inFlightUpdate = getInFlightUiModeUpdate();
      if (inFlightUpdate !== null) await inFlightUpdate.catch(() => undefined);
      const loadedUiMode = await uiModeService.load();
      if (!isCurrent()) return false;
      setUiModeState(loadedUiMode);
      return true;
    } catch (error) {
      if (error instanceof UiModeUnauthorizedError) clearAuthenticated();
      return false;
    } finally {
      if (isCurrent()) setIsUiModeLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (authenticationStatus !== 'authenticated') {
      syncGeneration.current += 1;
      queueMicrotask(() => {
        if (!isMounted.current) return;
        setUiModeState('system');
        setUiModeError(false);
        setIsUiModeLoading(false);
      });
      return () => { isMounted.current = false; };
    }

    void Promise.resolve().then(() => synchronizeUiMode());
    return () => {
      isMounted.current = false;
      syncGeneration.current += 1;
    };
  }, [authenticationStatus, synchronizeUiMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mediaQuery === undefined) return undefined;
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemThemeMode(event.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('hibilio-theme-dark', themeMode === 'dark');
  }, [themeMode]);

  const setUiMode = useCallback(async (nextUiMode: UiMode): Promise<void> => {
    if (authenticationStatus !== 'authenticated' || isUiModeSaving || nextUiMode === uiMode) return;
    setIsUiModeSaving(true);
    setUiModeError(false);
    let updateFailed = false;

    try {
      await uiModeService.update(nextUiMode);
    } catch {
      updateFailed = true;
    } finally {
      const synchronized = await synchronizeUiMode();
      if (isMounted.current) {
        setUiModeError(updateFailed || !synchronized);
        setIsUiModeSaving(false);
      }
    }
  }, [authenticationStatus, isUiModeSaving, synchronizeUiMode, uiMode]);

  const theme = useMemo(
    () => createTheme({
      palette: {
        background: {
          default: palette.background,
          paper: palette.card,
        },
        divider: palette.divider,
        mode: themeMode,
        primary: {
          main: palette.primary,
        },
        text: {
          primary: palette.text,
          secondary: palette.mutedText,
        },
      },
      shape: {
        borderRadius: 12,
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        h1: {
          fontFamily: 'Fraunces, serif',
          fontWeight: 600,
        },
        h6: {
          fontFamily: 'Fraunces, serif',
          fontWeight: 600,
        },
      },
    }),
    [palette, themeMode],
  );

  return (
    <AppThemeContext value={{ isUiModeLoading, isUiModeSaving, setUiMode, themeMode, uiMode, uiModeError }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppThemeContext>
  );
}
