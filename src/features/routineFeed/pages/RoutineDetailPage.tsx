import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { formatDuration, type Routine } from '../domain/routine';
import { routineFeedService, type RoutineFeedService } from '../services/routineFeedService';

type RoutineDetailPageProps = { service?: RoutineFeedService };

export function RoutineDetailPage({ service = routineFeedService }: RoutineDetailPageProps) {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<Routine>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (routineId ? service.getById(routineId) : Promise.resolve(undefined)).then((result) => {
      if (!cancelled) {
        setRoutine(result);
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setRoutine(undefined);
        setHasError(true);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [routineId, service]);

  if (isLoading) {
    return <Stack sx={{ alignItems: 'center', py: 12 }}><CircularProgress aria-label={messages.routineFeed.loading} /></Stack>;
  }

  return (
    <Container maxWidth="md" sx={{ px: { sm: 3, xs: 2 }, py: { sm: 3, xs: 2 } }}>
      <Button component={RouterLink} startIcon={<ArrowBackOutlinedIcon />} sx={{ mb: 2 }} to="/">{messages.routineFeed.backToList}</Button>
      {hasError && <Alert severity="error">{messages.routineFeed.error}</Alert>}
      {!hasError && !routine && <Alert severity="info">{messages.routineFeed.notFound}</Alert>}
      {!hasError && routine && (
        <Paper component="article" elevation={0} sx={{ border: 1, borderColor: 'divider', p: { sm: 4, xs: 2.5 } }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box sx={{ alignItems: 'center', bgcolor: 'primary.main', borderRadius: '50%', color: 'primary.contrastText', display: 'flex', fontWeight: 600, height: 40, justifyContent: 'center', width: 40 }}>{routine.author.name.slice(0, 1)}</Box>
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{routine.author.name}</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 12 }}>@{routine.author.handle}</Typography>
            </Box>
          </Stack>
          <Typography component="h1" sx={{ fontSize: { sm: 30, xs: 24 }, fontWeight: 600, mt: 3 }}>{routine.title}</Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', mt: 1 }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 13 }}>{formatDuration(routine.durationMinutes)}</Typography>
          </Stack>
          <Typography sx={{ lineHeight: 1.8, mt: 2 }}>{routine.description}</Typography>
          <Divider sx={{ my: 3 }} />
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>{messages.routineFeed.stepsTitle}</Typography>
          <Stack component="ol" spacing={1.5} sx={{ m: 0, mt: 2, pl: 3 }}>
            {routine.steps.map((step) => (
              <Box component="li" key={`${routine.id}-${step.time}`} sx={{ pl: 1 }}>
                <Typography sx={{ fontWeight: 500 }}>{step.action}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12 }}>{step.time}{step.duration && ` ・ ${step.duration}`}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
