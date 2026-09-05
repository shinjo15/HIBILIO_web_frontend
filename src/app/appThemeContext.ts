import { createContext, useContext } from 'react';

export type ThemeMode = 'dark' | 'light';

type AppThemeContextValue = {
  setThemeMode: (themeMode: ThemeMode) => void;
  themeMode: ThemeMode;
};

export const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
