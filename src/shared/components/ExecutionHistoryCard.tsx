import type { AccountExecutionSummary } from '../../features/account/domain/account';
import messages from '../message/message.json';
import { AccountAvatar } from './AccountImage';
import './executionHistoryCard.css';

type ExecutionHistoryCardProps = {
  author?: { iconImageUrl: string | null; name: string };
  dateLabel?: string;
  execution: AccountExecutionSummary;
  onSelect: (execution: AccountExecutionSummary) => void;
};

export function ExecutionHistoryCard({ author, dateLabel, execution, onSelect }: ExecutionHistoryCardProps) {
  return (
    <button aria-label={execution.routineTitle} className="account-page__card" onClick={() => onSelect(execution)} type="button">
      <div className="account-page__card-body">
        {author !== undefined && <div className="execution-history-card__author"><AccountAvatar className="execution-history-card__avatar" iconImageUrl={author.iconImageUrl} initial={author.name.slice(0, 1).toUpperCase()} /><span>{author.name}</span></div>}
        <div className="account-page__card-header">
          <h2 className="account-page__card-title">{execution.routineTitle}</h2>
          <span className="account-page__card-date">{dateLabel ?? new Date(execution.postedAt).toLocaleDateString('ja-JP')}</span>
        </div>
        {execution.memo !== null && <p className="account-profile__handle">{execution.memo}</p>}
      </div>
      <div className="account-page__card-metrics">
        <span>{messages.account.achieved} <strong>{execution.executedActionCount}</strong></span>
        <span>{messages.account.support} <strong>{execution.supportCount}</strong></span>
      </div>
    </button>
  );
}
