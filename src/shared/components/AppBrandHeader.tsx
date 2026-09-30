import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { IconButton, Stack, Typography } from '@mui/material';
import { HibilioMark } from '../brand/HibilioMark';
import messages from '../message/message.json';
import '../brand/appBrandHeader.css';

type AppBrandHeaderProps = { onSearchClick: () => void };

export function AppBrandHeader({ onSearchClick }: AppBrandHeaderProps) {
  return (
    <Stack className="app-brand-header">
      <Stack className="app-brand-header__brand">
        <HibilioMark />
        <Typography component="h1" className="app-brand-header__name">{messages.app.name}</Typography>
      </Stack>
      <IconButton aria-label={messages.routineFeed.search} className="app-brand-header__search" onClick={onSearchClick}>
        <SearchOutlinedIcon className="app-brand-header__search-icon" />
      </IconButton>
    </Stack>
  );
}
