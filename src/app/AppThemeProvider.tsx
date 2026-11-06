import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus, subscribeToAuthentication } from '../features/auth/services/authSession';
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
  const [uiMode, setUiModeState] = useState<UiMode | null>(null);
  const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [isUiModeLoading, setIsUiModeLoading] = useState(() => getAuthenticationStatus() === 'authenticated');
  const [isUiModeSaving, setIsUiModeSaving] = useState(false);
  const [uiModeError, setUiModeError] = useState(false);
  const savingOperation = useRef<symbol | null>(null);
  const syncGeneration = useRef(0);
  const sessionGeneration = useRef(0);
  const isMounted = useRef(true);
  const themeMode: ThemeMode = authenticationStatus !== 'authenticated' || uiMode === null ? 'light' : uiMode === 'system' ? systemThemeMode : uiMode;
  const palette = palettes[themeMode];

  const synchronizeUiMode = useCallback(async (expectedSessionGeneration = getAuthenticationGeneration()): Promise<boolean> => {
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    setIsUiModeLoading(true);
    setUiModeError(false);
    const isCurrent = () => isMounted.current && expectedSessionGeneration === getAuthenticationGeneration() && generation === syncGeneration.current;

    try {
      const inFlightUpdate = getInFlightUiModeUpdate(expectedSessionGeneration);
      if (inFlightUpdate !== null) await inFlightUpdate.catch(() => undefined);
      const loadedUiMode = await uiModeService.load(expectedSessionGeneration);
      if (!isCurrent()) return false;
      setUiModeState(loadedUiMode);
      return true;
    } catch (error) {
      if (error instanceof UiModeUnauthorizedError) clearAuthenticated();
      if (isCurrent()) {
        setUiModeState(null);
        setUiModeError(true);
      }
      return false;
    } finally {
      if (isCurrent()) setIsUiModeLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    sessionGeneration.current = getAuthenticationGeneration();
    if (authenticationStatus !== 'authenticated') {
      syncGeneration.current += 1;
      queueMicrotask(() => {
        if (!isMounted.current) return;
        setUiModeState(null);
        setUiModeError(false);
        setIsUiModeLoading(false);
        savingOperation.current = null;
        setIsUiModeSaving(false);
      });
      return () => { isMounted.current = false; };
    }

    void Promise.resolve().then(() => {
      setUiModeState(null);
      setUiModeError(false);
      return synchronizeUiMode(sessionGeneration.current);
    });
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
    if (authenticationStatus !== 'authenticated' || savingOperation.current !== null || nextUiMode === uiMode) return;
    const updateSessionGeneration = getAuthenticationGeneration();
    const operation = Symbol('ui-mode-save');
    savingOperation.current = operation;
    setIsUiModeSaving(true);
    setUiModeError(false);
    let updateFailed = false;

    try {
      await uiModeService.update(nextUiMode, updateSessionGeneration);
    } catch {
      updateFailed = true;
    } finally {
      const synchronized = updateSessionGeneration === getAuthenticationGeneration() ? await synchronizeUiMode(updateSessionGeneration) : false;
      if (savingOperation.current === operation) savingOperation.current = null;
      if (isMounted.current && updateSessionGeneration === getAuthenticationGeneration()) {
        setUiModeError(updateFailed || !synchronized);
        setIsUiModeSaving(false);
      }
    }
  }, [authenticationStatus, synchronizeUiMode, uiMode]);

  const retryUiMode = useCallback(() => {
    if (authenticationStatus !== 'authenticated' || savingOperation.current !== null) return;
    void synchronizeUiMode(getAuthenticationGeneration());
  }, [authenticationStatus, synchronizeUiMode]);

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
    <AppThemeContext value={{ isUiModeLoading, isUiModeSaving, retryUiMode, setUiMode, systemThemeMode, themeMode, uiMode, uiModeError }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppThemeContext>
  );
}
