import { createContext, useContext } from 'react';

import type { UiMode } from './uiModeService';

export type ThemeMode = 'dark' | 'light';

type AppThemeContextValue = {
  isUiModeLoading: boolean;
  isUiModeSaving: boolean;
  setUiMode: (uiMode: UiMode) => Promise<void>;
  themeMode: ThemeMode;
  uiMode: UiMode;
  uiModeError: boolean;
};

export const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
