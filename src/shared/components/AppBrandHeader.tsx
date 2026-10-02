import { Stack, Typography } from '@mui/material';
import { HibilioMark } from '../brand/HibilioMark';
import messages from '../message/message.json';
import '../brand/appBrandHeader.css';

export function AppBrandHeader() {
  return (
    <Stack className="app-brand-header">
      <Stack className="app-brand-header__brand">
        <HibilioMark />
        <Typography component="h1" className="app-brand-header__name">{messages.app.name}</Typography>
      </Stack>
      <Typography className="app-brand-header__tagline">{messages.app.tagline}</Typography>
    </Stack>
  );
}
