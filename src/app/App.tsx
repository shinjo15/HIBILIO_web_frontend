import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from './AppErrorBoundary';
import { AppThemeProvider } from './AppThemeProvider';
import { router } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppThemeProvider>
        <RouterProvider router={router} />
      </AppThemeProvider>
    </AppErrorBoundary>
  );
}
