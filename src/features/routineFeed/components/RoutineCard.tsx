import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { formatDuration, formatPostedAt, type Routine } from '../domain/routine';

type RoutineCardProps = {
  routine: Routine;
  onLike: (id: string) => void;
};

export function RoutineCard({ routine, onLike }: RoutineCardProps) {
  const avatarClasses: Record<string, string> = {
    H: 'routine-card__avatar--h',
    N: 'routine-card__avatar--n',
    S: 'routine-card__avatar--s',
    T: 'routine-card__avatar--t',
    Y: 'routine-card__avatar--y',
  };
  const avatarInitial = routine.author.handle.slice(0, 1).toUpperCase();
  const avatarClass = avatarClasses[avatarInitial] ?? 'routine-card__avatar--default';
  const likeClass = routine.liked ? 'routine-card__like routine-card__like--liked' : 'routine-card__like';

  return (
    <Paper
      component="article"
      className="routine-card"
    >
      <Box className="routine-card__content">
          <Stack className="routine-card__header">
            <Stack className="routine-card__author">
              <Box aria-hidden="true" className={`routine-card__avatar ${avatarClass}`}>
                {avatarInitial}
              </Box>
              <Typography className="routine-card__handle">@{routine.author.handle}</Typography>
            </Stack>
            <Stack className="routine-card__metadata">
              <Typography className="routine-card__metadata-text">{formatPostedAt(routine.createdAt)}</Typography>
              <Stack className="routine-card__duration">
                <ClockIcon />
                <Typography className="routine-card__metadata-text">{formatDuration(routine.durationMinutes)}</Typography>
              </Stack>
            </Stack>
          </Stack>

          <Typography component="h2" className="routine-card__title">
            <Link className="routine-card__detail-link" to={`/routines/${routine.id}`}>{routine.title}</Link>
          </Typography>
          <Stack className="routine-card__tags">
            {routine.tags.slice(0, 3).map((tag) => <Box component="span" className="routine-card__tag" key={tag}>{tag}</Box>)}
          </Stack>
          <Stack className="routine-card__steps">
            {routine.steps.slice(0, 3).map((step) => (
              <Typography className="routine-card__step" key={`${routine.id}-${step.time}`}>
                {step.action}{step.duration && <Box component="span" className="routine-card__step-duration">（{step.duration}）</Box>}
              </Typography>
            ))}
            {routine.steps.length > 3 && <Typography className="routine-card__more-steps">{messages.routineFeed.moreSteps.replace('{count}', String(routine.steps.length - 3))}</Typography>}
          </Stack>

          <Stack className="routine-card__actions">
            <Box component="button" aria-label={routine.liked ? messages.routineFeed.unlike : messages.routineFeed.like} className={likeClass} onClick={() => onLike(routine.id)}>
              <HeartIcon filled={routine.liked} />
              <Typography component="span" className="routine-card__action-value">{routine.likes}</Typography>
            </Box>
            <ActionItem icon={<RunIcon />} value={routine.executions} />
            <ActionItem icon={<ShuffleIcon />} value={routine.customizations} />
          </Stack>
      </Box>
    </Paper>
  );
}

function ActionItem({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <Box className="routine-card__action">
      {icon}
      <Typography component="span" className="routine-card__action-value">{value}</Typography>
    </Box>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" fill={filled ? 'currentColor' : 'none'} height="16" viewBox="0 0 24 24" width="16">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="13" viewBox="0 0 24 24" width="13">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function RunIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <polyline points="16 3 21 3 21 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="4" x2="21" y1="20" y2="3" />
      <polyline points="21 16 21 21 16 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="15" x2="21" y1="15" y2="21" />
      <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="4" x2="9" y1="4" y2="9" />
    </svg>
  );
}
