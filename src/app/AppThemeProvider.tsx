import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(
    () => createTheme({
      colorSchemes: {
        dark: true,
      },
      cssVariables: true,
      palette: {
        mode: prefersDarkMode ? 'dark' : 'light',
        primary: {
          main: prefersDarkMode ? '#d97240' : '#c2612a',
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
      },
    }),
    [prefersDarkMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
