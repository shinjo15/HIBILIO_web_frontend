import type { AccountExecutionSummary } from '../../features/account/domain/account';
import messages from '../message/message.json';
import './executionHistoryCard.css';

type ExecutionHistoryCardProps = {
  dateLabel?: string;
  execution: AccountExecutionSummary;
  onSelect: (execution: AccountExecutionSummary) => void;
};

export function ExecutionHistoryCard({ dateLabel, execution, onSelect }: ExecutionHistoryCardProps) {
  return (
    <button aria-label={execution.routineTitle} className="account-page__card" onClick={() => onSelect(execution)} type="button">
      <div className="account-page__card-body">
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
