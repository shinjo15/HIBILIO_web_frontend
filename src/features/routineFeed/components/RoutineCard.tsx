import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import ShuffleOutlinedIcon from '@mui/icons-material/ShuffleOutlined';
import { Box, CardActionArea, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { formatDuration, formatPostedAt, type Routine } from '../domain/routine';

type RoutineCardProps = {
  routine: Routine;
  onLike: (id: string) => void;
};

export function RoutineCard({ routine, onLike }: RoutineCardProps) {
  return (
    <Paper
      component="article"
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 16px rgba(28, 24, 20, 0.08)' },
      }}
    >
      <CardActionArea component={RouterLink} to={`/routines/${routine.id}`}>
        <Box sx={{ p: { sm: 2.5, xs: 2 } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box aria-hidden="true" sx={{ alignItems: 'center', bgcolor: 'primary.main', borderRadius: '50%', color: 'primary.contrastText', display: 'flex', flexShrink: 0, fontSize: 14, fontWeight: 600, height: 34, justifyContent: 'center', width: 34 }}>
                {routine.author.name.slice(0, 1)}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{routine.author.name}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 12 }}>@{routine.author.handle}</Typography>
              </Box>
            </Stack>
            <Stack spacing={0.25} sx={{ alignItems: 'flex-end' }}>
              <Typography color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatPostedAt(routine.createdAt)}</Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography color="text.secondary" sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDuration(routine.durationMinutes)}</Typography>
              </Stack>
            </Stack>
          </Stack>

          <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, mt: 2 }}>{routine.title}</Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {routine.tags.slice(0, 3).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'var(--hibilio-color-muted)', color: 'text.secondary', fontSize: 11, height: 24 }} />)}
          </Stack>
          <Stack spacing={0.5} sx={{ mt: 1.75 }}>
            {routine.steps.slice(0, 3).map((step) => (
              <Typography color="text.secondary" key={`${routine.id}-${step.time}`} sx={{ fontSize: 13 }}>
                {step.action}{step.duration && `（${step.duration}）`}
              </Typography>
            ))}
            {routine.steps.length > 3 && <Typography color="text.secondary" sx={{ fontSize: 12 }}>{messages.routineFeed.moreSteps.replace('{count}', String(routine.steps.length - 3))}</Typography>}
          </Stack>
        </Box>
      </CardActionArea>

      <Stack direction="row" divider={<Box sx={{ bgcolor: 'divider', height: 18, width: 1 }} />} spacing={1.5} sx={{ alignItems: 'center', borderTop: 1, borderColor: 'divider', px: { sm: 2.5, xs: 2 }, py: 0.75 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <IconButton aria-label={routine.liked ? messages.routineFeed.unlike : messages.routineFeed.like} color={routine.liked ? 'primary' : 'default'} onClick={() => onLike(routine.id)} size="small">
            {routine.liked ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderOutlinedIcon sx={{ fontSize: 18 }} />}
          </IconButton>
          <Typography color="text.secondary" sx={{ fontSize: 12 }}>{routine.likes}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <PlayArrowOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography color="text.secondary" sx={{ fontSize: 12 }}>{routine.executions}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <ShuffleOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography color="text.secondary" sx={{ fontSize: 12 }}>{routine.customizations}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
