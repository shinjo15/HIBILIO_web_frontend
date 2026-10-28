import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import type { AccountExecutionSummary } from '../../features/account/domain/account';
import messages from '../message/message.json';
import { AccountAvatar } from './AccountImage';
import './executionHistoryCard.css';

type ExecutionHistoryCardProps = {
  author?: { iconImageUrl: string | null; name: string };
  dateLabel?: string;
  execution: AccountExecutionSummary;
  onReport?: () => void;
  onSelect: (execution: AccountExecutionSummary) => void;
};

export function ExecutionHistoryCard({ author, dateLabel, execution, onReport, onSelect }: ExecutionHistoryCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const avatarClasses: Record<string, string> = {
    H: 'routine-card__avatar--h',
    N: 'routine-card__avatar--n',
    S: 'routine-card__avatar--s',
    T: 'routine-card__avatar--t',
    Y: 'routine-card__avatar--y',
  };
  const authorInitial = author?.name.slice(0, 1).toUpperCase();
  const avatarClass = authorInitial === undefined ? '' : avatarClasses[authorInitial] ?? 'routine-card__avatar--default';

  return (
    <article className="account-page__card execution-history-card">
      <button aria-label={execution.routineTitle} className="execution-history-card__select" onClick={() => onSelect(execution)} type="button">
      <div className="account-page__card-body">
        <div className="account-page__card-header execution-history-card__header">
          {author !== undefined && <div className="routine-card__author execution-history-card__author"><AccountAvatar className={`routine-card__avatar ${avatarClass}`} iconImageUrl={author.iconImageUrl} initial={authorInitial ?? ''} /><span className="routine-card__handle"><span className="execution-history-card__author-name">{author.name}</span><span className="execution-history-card__action-label"> がルーティンを実行</span></span></div>}
          <h2 className="account-page__card-title">{execution.routineTitle}</h2>
          <div className={`execution-history-card__metadata${onReport !== undefined ? ' execution-history-card__metadata--with-menu' : ''}`}><span className="account-page__card-date">{dateLabel ?? new Date(execution.postedAt).toLocaleDateString('ja-JP')}</span></div>
        </div>
        {execution.memo !== null && <p className="account-profile__handle">{execution.memo}</p>}
      </div>
      <div className="account-page__card-metrics">
        <span>{messages.account.achieved} <strong>{execution.executedActionCount}</strong></span>
        <span>{messages.account.support} <strong>{execution.supportCount}</strong></span>
      </div>
      </button>
      {onReport !== undefined && <IconButton aria-controls={menuAnchor !== null ? `execution-report-menu-${execution.id}` : undefined} aria-expanded={menuAnchor !== null} aria-haspopup="menu" aria-label={messages.report.postMenu} className="execution-history-card__more" onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); }} size="small"><MoreVertIcon /></IconButton>}
      <Menu anchorEl={menuAnchor} id={`execution-report-menu-${execution.id}`} onClose={() => setMenuAnchor(null)} open={menuAnchor !== null}><MenuItem onClick={(event) => { event.stopPropagation(); setMenuAnchor(null); onReport?.(); }}>{messages.report.postMenuReport}</MenuItem></Menu>
    </article>
  );
}
