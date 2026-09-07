import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { RoutineCard } from '../components/RoutineCard';
import type { Routine, RoutineFeedTab } from '../domain/routine';
import { routineFeedService, type RoutineFeedService } from '../services/routineFeedService';
import { HibilioMark } from '../../../shared/brand/HibilioMark';
import messages from '../../../shared/message/message.json';
import '../routineFeed.css';
import '../routineFeedTypography.css';

type RoutineFeedPageProps = { service?: RoutineFeedService };

const tabs: Array<{ label: string; value: RoutineFeedTab }> = [
  { label: messages.routineFeed.tabs.following, value: 'following' },
  { label: messages.routineFeed.tabs.recommended, value: 'recommended' },
  { label: messages.routineFeed.tabs.popular, value: 'popular' },
];

export function RoutineFeedPage({ service = routineFeedService }: RoutineFeedPageProps) {
  const [activeTab, setActiveTab] = useState<RoutineFeedTab>('recommended');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadRoutines = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      setRoutines(await service.list(activeTab));
    } catch {
      setRoutines([]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, service]);

  useEffect(() => {
    let cancelled = false;

    service.list(activeTab).then((result) => {
      if (!cancelled) {
        setRoutines(result);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setRoutines([]);
        setHasError(true);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [activeTab, service]);

  function handleTabChange(tab: RoutineFeedTab) {
    setIsLoading(true);
    setHasError(false);
    setActiveTab(tab);
  }


  return (
    <Box component="section" className="routine-feed-page">
      <Box className="routine-feed-header">
          <Stack className="routine-feed-header__top">
            <Stack className="routine-feed-brand">
              <HibilioMark />
              <Typography component="h1" className="routine-feed-brand__name">
                {messages.app.name}
              </Typography>
            </Stack>
            <IconButton
              aria-label={messages.routineFeed.search}
              className="routine-feed-search"
            >
              <SearchOutlinedIcon className="routine-feed-search__icon" />
            </IconButton>
          </Stack>
          <Tabs
            aria-label={messages.routineFeed.tabs.ariaLabel}
            className="routine-feed-tabs"
            onChange={(_, value: RoutineFeedTab) => handleTabChange(value)}
            value={activeTab}
          >
            {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
          </Tabs>
      </Box>

      <Box className="routine-feed-scroll">
        <Box className="routine-feed-content">
        {isLoading && (
          <Stack className="routine-feed-loading">
            <CircularProgress aria-label={messages.routineFeed.loading} className="routine-feed-loading__progress" />
            <Typography className="routine-feed-loading__text">{messages.routineFeed.loading}</Typography>
          </Stack>
        )}

        {!isLoading && hasError && (
          <Alert
            action={<Button className="routine-feed-error__retry" onClick={() => void loadRoutines()} startIcon={<RefreshOutlinedIcon />}>{messages.routineFeed.retry}</Button>}
            icon={<ErrorOutlineOutlinedIcon />}
            severity="error"
            className="routine-feed-error"
          >
            {messages.routineFeed.error}
          </Alert>
        )}

        {!isLoading && !hasError && routines.length === 0 && (
          <Stack className="routine-feed-empty">
            <Typography component="h2" className="routine-feed-empty__title">{messages.routineFeed.emptyTitle}</Typography>
            <Typography className="routine-feed-empty__description">{messages.routineFeed.emptyDescription}</Typography>
          </Stack>
        )}

        {!isLoading && !hasError && routines.length > 0 && (
          <Stack className="routine-feed-list">
            {routines.map((routine) => <RoutineCard key={routine.id} routine={routine} />)}
            <Box className="routine-feed-list__spacer" />
          </Stack>
        )}
        </Box>
      </Box>
    </Box>
  );
}
