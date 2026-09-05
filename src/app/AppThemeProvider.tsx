import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppThemeContext, type ThemeMode } from './appThemeContext';

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
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const palette = palettes[themeMode];

  useEffect(() => {
    document.documentElement.classList.toggle('hibilio-theme-dark', themeMode === 'dark');
  }, [themeMode]);

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
    <AppThemeContext value={{ setThemeMode, themeMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppThemeContext>
  );
}
