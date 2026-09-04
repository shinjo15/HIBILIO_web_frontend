import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

type AppThemeProviderProps = {
  children: ReactNode;
};

const lightPalette = {
  background: '#f8f5f2',
  card: '#ffffff',
  divider: '#e5ddd6',
  muted: '#f2ede8',
  mutedText: '#7a6e66',
  primary: '#c2612a',
  text: '#1c1814',
};

const darkPalette = {
  background: '#18130f',
  card: '#231a13',
  divider: '#3a2a1f',
  muted: '#2a1f18',
  mutedText: '#8c7b6e',
  primary: '#d97240',
  text: '#f0e8e0',
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const palette = prefersDarkMode ? darkPalette : lightPalette;
  const theme = useMemo(
    () => createTheme({
      palette: {
        background: {
          default: palette.background,
          paper: palette.card,
        },
        divider: palette.divider,
        mode: prefersDarkMode ? 'dark' : 'light',
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
    [palette, prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
