import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Box, IconButton, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import messages from '../../../shared/message/message.json';
import { AccountAvatar } from '../../../shared/components/AccountImage';
import { formatPostedAt, type Routine } from '../domain/routine';

type ExecutionPostCardProps = {
  onReport?: (post: Routine) => void;
  post: Routine & { routineExecutionId: string };
};

export function ExecutionPostCard({ onReport, post }: ExecutionPostCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const executionDetailPath = `/routines/${post.routineId}/executions/${post.routineExecutionId}`;
  const avatarInitial = post.authorName.slice(0, 1).toUpperCase();

  return (
    <Paper component="article" className="execution-post-card">
      <Box className="execution-post-card__content">
        <Stack className="execution-post-card__header">
          <Stack className="execution-post-card__author">
            <AccountAvatar className="execution-post-card__avatar" iconImageUrl={post.iconImageUrl ?? null} initial={avatarInitial} />
            <Typography className="execution-post-card__author-name">{post.authorName}</Typography>
          </Stack>
          <Stack className="execution-post-card__metadata">
            <Typography>{formatPostedAt(post.createdAt)}</Typography>
            {onReport !== undefined && <IconButton aria-controls={menuAnchor !== null ? `execution-post-report-menu-${post.id}` : undefined} aria-expanded={menuAnchor !== null} aria-haspopup="menu" aria-label={messages.report.postMenu} className="execution-post-card__more" onClick={(event) => { setMenuAnchor(event.currentTarget); }} size="small"><MoreVertIcon /></IconButton>}
          </Stack>
        </Stack>

        <Typography className="execution-post-card__eyebrow">{messages.routineFeed.executionPost}</Typography>
        <Typography component="h2" className="execution-post-card__title">
          <Link to={executionDetailPath}>{post.title}</Link>
        </Typography>
        <Link className="execution-post-card__detail-link" to={executionDetailPath}>{messages.routineFeed.executionDetail}</Link>

        <Box aria-label={post.supported ? messages.routineDetail.supported : messages.routineDetail.support} className="execution-post-card__support">
          <SupportIcon filled={post.supported ?? false} />
          <Typography component="span">{post.supported ? messages.routineDetail.supported : messages.routineDetail.support}</Typography>
        </Box>
      </Box>
      <Menu anchorEl={menuAnchor} id={`execution-post-report-menu-${post.id}`} onClose={() => setMenuAnchor(null)} open={menuAnchor !== null}><MenuItem onClick={() => { setMenuAnchor(null); onReport?.(post); }}>{messages.report.postMenuReport}</MenuItem></Menu>
    </Paper>
  );
}

function SupportIcon({ filled }: { filled: boolean }) {
  return <svg aria-hidden="true" fill={filled ? 'currentColor' : 'none'} height="16" viewBox="0 0 24 24" width="16"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2H14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 0 2-2h3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
