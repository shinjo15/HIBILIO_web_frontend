import { CssBaseline } from '@mui/material';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <>
    <CssBaseline />
    <App />
  </>,
);
