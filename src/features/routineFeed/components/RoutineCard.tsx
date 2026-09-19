import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, IconButton, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { formatDuration, formatPostedAt, type Routine } from '../domain/routine';
import { AccountAvatar } from '../../../shared/components/AccountImage';


type RoutineCardProps = {
  likeAnimation?: 'like' | 'unlike' | null;
  isLiking?: boolean;
  onLike?: (postIdentifier: string) => void;
  onReport?: (routine: Routine) => void;
  routine: Routine;
};

export function RoutineCard({ isLiking = false, likeAnimation = null, onLike, onReport, routine }: RoutineCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const avatarClasses: Record<string, string> = {
    H: 'routine-card__avatar--h',
    N: 'routine-card__avatar--n',
    S: 'routine-card__avatar--s',
    T: 'routine-card__avatar--t',
    Y: 'routine-card__avatar--y',
  };
  const avatarInitial = routine.authorName.slice(0, 1).toUpperCase();
  const avatarClass = avatarClasses[avatarInitial] ?? 'routine-card__avatar--default';
  const likeClass = [
    'routine-card__like',
    routine.liked && 'routine-card__like--liked',
    likeAnimation === 'like' && 'routine-card__like--like-animation',
    likeAnimation === 'unlike' && 'routine-card__like--unlike-animation',
  ].filter(Boolean).join(' ');

  return (
    <Paper
      component="article"
      className="routine-card"
    >
      <Box className="routine-card__content">
          <Stack className="routine-card__header">
            <Stack className="routine-card__author">
              <AccountAvatar className={`routine-card__avatar ${avatarClass}`} iconImageUrl={routine.iconImageUrl ?? null} initial={avatarInitial} />
              <Typography className="routine-card__handle"><Link className="routine-card__author-link" to={`/accounts/${routine.accountId}`}>{routine.authorName}</Link></Typography>
            </Stack>
            <Stack className="routine-card__metadata">
              <Stack className="routine-card__metadata-top">
                <Typography className="routine-card__metadata-text">{formatPostedAt(routine.createdAt)}</Typography>
                {onReport !== undefined && <IconButton aria-controls={menuAnchor !== null ? `routine-report-menu-${routine.id}` : undefined} aria-expanded={menuAnchor !== null} aria-haspopup="menu" aria-label={messages.report.postMenu} className="routine-card__more" onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); }} size="small"><MoreVertIcon /></IconButton>}
              </Stack>
            </Stack>
          </Stack>

          {routine.durationMinutes !== null && <Stack className="routine-card__duration routine-card__execution-duration"><ClockIcon /><Typography className="routine-card__metadata-text">{formatDuration(routine.durationMinutes)}</Typography></Stack>}
          <Typography component="h2" className="routine-card__title">
            <Link className="routine-card__detail-link" to={`/routines/${routine.routineId}`}>{routine.title}</Link>
          </Typography>
          <Stack className="routine-card__tags">
            {routine.tags.slice(0, 3).map((tag) => <Box component="span" className="routine-card__tag" key={tag}>{tag}</Box>)}
          </Stack>
          <Stack className="routine-card__steps">
            {routine.steps.slice(0, 3).map((step) => (
              <Typography className="routine-card__step" key={`${routine.id}-${step.action}`}>
                {step.action}{step.durationMinutes !== null && <Box component="span" className="routine-card__step-duration">（{formatDuration(step.durationMinutes)}）</Box>}
              </Typography>
            ))}
            {routine.steps.length > 3 && <Typography className="routine-card__more-steps">{messages.routineFeed.moreSteps.replace('{count}', String(routine.steps.length - 3))}</Typography>}
          </Stack>

          <Stack className="routine-card__actions">
            {routine.postCategory === 'action'
              ? <ActionItem icon={<SupportIcon filled={routine.supported ?? false} />} label={routine.supported ? messages.routineDetail.supported : messages.routineDetail.support} />
              : <button aria-label={routine.liked ? messages.routineFeed.unlike : messages.routineFeed.like} className={likeClass} disabled={isLiking || onLike === undefined} onClick={(event) => { event.stopPropagation(); onLike?.(routine.id); }} type="button">
                <HeartIcon filled={routine.liked} />
                <Typography component="span" className="routine-card__action-value">{routine.likes}</Typography>
              </button>}
            <ActionItem icon={<RunIcon />} value={routine.executions} />
            <ActionItem icon={<ShuffleIcon />} value={routine.customizations} />
          </Stack>
      </Box>
      <Menu anchorEl={menuAnchor} id={`routine-report-menu-${routine.id}`} onClose={() => setMenuAnchor(null)} open={menuAnchor !== null}><MenuItem onClick={(event) => { event.stopPropagation(); setMenuAnchor(null); onReport?.(routine); }}>{messages.report.postMenuReport}</MenuItem></Menu>
    </Paper>
  );
}

function ActionItem({ icon, label, value }: { icon: ReactNode; label?: string; value?: number }) {
  return (
    <Box aria-label={label} className="routine-card__action">
      {icon}
      {value !== undefined && <Typography component="span" className="routine-card__action-value">{value}</Typography>}
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

function SupportIcon({ filled }: { filled: boolean }) {
  return <svg aria-hidden="true" fill={filled ? 'currentColor' : 'none'} height="16" viewBox="0 0 24 24" width="16"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2H14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
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
