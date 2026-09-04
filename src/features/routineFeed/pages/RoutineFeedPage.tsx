import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Alert, Box, Button, CircularProgress, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { RoutineCard } from '../components/RoutineCard';
import type { Routine, RoutineFeedTab } from '../domain/routine';
import { routineFeedService, type RoutineFeedService } from '../services/routineFeedService';
import messages from '../../../shared/message/message.json';

type RoutineFeedPageProps = { service?: RoutineFeedService };

const tabs: Array<{ label: string; value: RoutineFeedTab }> = [
  { label: messages.routineFeed.tabs.recommended, value: 'recommended' },
  { label: messages.routineFeed.tabs.popular, value: 'popular' },
  { label: messages.routineFeed.tabs.recent, value: 'recent' },
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

  function handleLike(id: string) {
    setRoutines((current) => current.map((routine) => (
      routine.id === id
        ? { ...routine, liked: !routine.liked, likes: routine.liked ? routine.likes - 1 : routine.likes + 1 }
        : routine
    )));
  }

  return (
    <Box component="section" sx={{ minHeight: '100dvh' }}>
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="md" sx={{ px: { sm: 3, xs: 2 }, pt: { sm: 4, xs: 2.5 } }}>
          <Typography component="h1" sx={{ fontSize: { sm: 30, xs: 26 }, fontWeight: 600 }}>
            {messages.routineFeed.title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.75 }}>
            {messages.routineFeed.subtitle}
          </Typography>
          <Tabs
            aria-label={messages.routineFeed.tabs.ariaLabel}
            onChange={(_, value: RoutineFeedTab) => handleTabChange(value)}
            sx={{ mt: 2 }}
            value={activeTab}
          >
            {tabs.map((tab) => <Tab key={tab.value} label={tab.label} value={tab.value} />)}
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ px: { sm: 3, xs: 2 }, py: { sm: 3, xs: 2 } }}>
        {isLoading && (
          <Stack spacing={1.5} sx={{ alignItems: 'center', py: 10 }}>
            <CircularProgress aria-label={messages.routineFeed.loading} color="primary" size={32} />
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>{messages.routineFeed.loading}</Typography>
          </Stack>
        )}

        {!isLoading && hasError && (
          <Alert
            action={<Button color="inherit" onClick={() => void loadRoutines()} size="small" startIcon={<RefreshOutlinedIcon />}>{messages.routineFeed.retry}</Button>}
            icon={<ErrorOutlineOutlinedIcon />}
            severity="error"
            sx={{ mt: 2 }}
          >
            {messages.routineFeed.error}
          </Alert>
        )}

        {!isLoading && !hasError && routines.length === 0 && (
          <Stack spacing={1} sx={{ alignItems: 'center', py: 10, textAlign: 'center' }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>{messages.routineFeed.emptyTitle}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>{messages.routineFeed.emptyDescription}</Typography>
          </Stack>
        )}

        {!isLoading && !hasError && routines.length > 0 && (
          <Stack spacing={1.5}>
            {routines.map((routine) => <RoutineCard key={routine.id} onLike={handleLike} routine={routine} />)}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
