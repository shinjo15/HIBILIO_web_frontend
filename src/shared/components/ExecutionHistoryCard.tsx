import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { AccountExecutionSummary } from '../../features/account/domain/account';
import messages from '../message/message.json';
import { AccountAvatar } from './AccountImage';
import './executionHistoryCard.css';

type ExecutionHistoryCardExecution = AccountExecutionSummary;

type ExecutionHistoryCardProps<T extends ExecutionHistoryCardExecution> = {
  author?: { iconImageUrl: string | null; name: string };
  dateLabel?: string;
  execution: T;
  onReport?: () => void;
  onSelect: (execution: T) => void;
};

export function ExecutionHistoryCard<T extends ExecutionHistoryCardExecution>({ author, dateLabel, execution, onReport, onSelect }: ExecutionHistoryCardProps<T>) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const activePointerId = useRef<number | null>(null);
  const wasDragged = useRef(false);
  const pointerTracking = useRef<{ cancel: (event: PointerEvent) => void; move: (event: PointerEvent) => void; stop: (event?: PointerEvent) => void } | null>(null);
  const avatarClasses: Record<string, string> = {
    H: 'routine-card__avatar--h',
    N: 'routine-card__avatar--n',
    S: 'routine-card__avatar--s',
    T: 'routine-card__avatar--t',
    Y: 'routine-card__avatar--y',
  };
  const authorInitial = author?.name.slice(0, 1).toUpperCase();
  const avatarClass = authorInitial === undefined ? '' : avatarClasses[authorInitial] ?? 'routine-card__avatar--default';

  useEffect(() => {
    function trackPointerMove(event: PointerEvent) {
      const start = pointerStart.current;
      if (activePointerId.current !== event.pointerId || start === null) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) wasDragged.current = true;
    }

    function stopTrackingPointer(event?: PointerEvent) {
      if (event !== undefined && activePointerId.current !== event.pointerId) return;
      document.removeEventListener('pointermove', trackPointerMove);
      document.removeEventListener('pointerup', stopTrackingPointer);
      document.removeEventListener('pointercancel', cancelPointer);
      activePointerId.current = null;
      pointerStart.current = null;
    }

    function cancelPointer(event: PointerEvent) {
      if (activePointerId.current !== event.pointerId) return;
      wasDragged.current = true;
      stopTrackingPointer();
    }

    pointerTracking.current = { cancel: cancelPointer, move: trackPointerMove, stop: stopTrackingPointer };
    return () => {
      stopTrackingPointer();
      pointerTracking.current = null;
    };
  }, []);

  return (
    <article className="account-page__card execution-history-card">
      <button
        aria-label={execution.routineTitle}
        className="execution-history-card__select"
        onClick={(event) => {
          const hasSelection = globalThis.getSelection?.()?.type === 'Range';
          if ((event.detail === 0 || !wasDragged.current) && !hasSelection) onSelect(execution);
          wasDragged.current = false;
        }}
        onPointerDown={(event) => {
          const tracking = pointerTracking.current;
          if (activePointerId.current !== null || tracking === null) return;
          pointerStart.current = { x: event.clientX, y: event.clientY };
          activePointerId.current = event.pointerId;
          wasDragged.current = false;
          document.addEventListener('pointermove', tracking.move);
          document.addEventListener('pointerup', tracking.stop);
          document.addEventListener('pointercancel', tracking.cancel);
        }}
        type="button"
      >
      <div className="account-page__card-body">
        <div className="account-page__card-header execution-history-card__header">
          {author !== undefined && <div className="routine-card__author execution-history-card__author"><AccountAvatar className={`routine-card__avatar ${avatarClass}`} iconImageUrl={author.iconImageUrl} initial={authorInitial ?? ''} /><span className="routine-card__handle"><span className="execution-history-card__author-name">{author.name}</span><span className="execution-history-card__action-label"> がルーティンを実行</span></span></div>}
          <h2 className="account-page__card-title">{execution.routineTitle}</h2>
          <div className={`execution-history-card__metadata${onReport !== undefined ? ' execution-history-card__metadata--with-menu' : ''}`}><span className="account-page__card-date">{dateLabel ?? (execution.postedAt === null ? '' : new Date(execution.postedAt).toLocaleDateString('ja-JP'))}</span></div>
        </div>
        {execution.memo !== null && <p className="account-profile__handle">{execution.memo}</p>}
      </div>
      <div className="account-page__card-metrics">
        <span>{messages.account.achieved} <strong>{execution.executedActionCount}</strong></span>
        {execution.supportCount !== null && <span>{messages.account.support} <strong>{execution.supportCount}</strong></span>}
      </div>
      </button>
      {onReport !== undefined && <IconButton aria-controls={menuAnchor !== null ? `execution-report-menu-${execution.id}` : undefined} aria-expanded={menuAnchor !== null} aria-haspopup="menu" aria-label={messages.report.postMenu} className="execution-history-card__more" onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); }} size="small"><MoreVertIcon /></IconButton>}
      <Menu anchorEl={menuAnchor} id={`execution-report-menu-${execution.id}`} onClose={() => setMenuAnchor(null)} open={menuAnchor !== null}><MenuItem onClick={(event) => { event.stopPropagation(); setMenuAnchor(null); onReport?.(); }}>{messages.report.postMenuReport}</MenuItem></Menu>
    </article>
  );
}
