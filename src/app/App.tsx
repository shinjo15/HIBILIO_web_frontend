import { RouterProvider } from 'react-router-dom';
import { AppThemeProvider } from './AppThemeProvider';
import { router } from './router';

export function App() {
  return (
    <AppThemeProvider>
      <RouterProvider router={router} />
    </AppThemeProvider>
  );
}
