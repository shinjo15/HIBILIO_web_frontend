import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { RoutineExecutionHeader } from '../../routineExecution/components/RoutineExecutionHeader';
import { RoutineExecutionStepList } from '../../routineExecution/components/RoutineExecutionStepList';
import type { AccountExecutionHistory } from '../domain/account';
import { accountService, type AccountService } from '../services/accountService';
import '../../routineExecution/routineExecution.css';

type AccountExecutionHistoryPageProps = {
  accountService?: AccountService;
};

export function AccountExecutionHistoryPage({
  accountService: historyService = accountService,
}: AccountExecutionHistoryPageProps) {
  const navigate = useNavigate();
  const { executionId = '', routineId = '' } = useParams<{ executionId: string; routineId: string }>();
  const [history, setHistory] = useState<AccountExecutionHistory | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    historyService.getExecutionHistory(executionId)
      .then((loadedHistory) => {
        if (cancelled) {
          return;
        }

        if (!loadedHistory || loadedHistory.routineId !== routineId) {
          setHistory(null);
          return;
        }

        setHistory(loadedHistory);
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [executionId, historyService, routineId]);

  if (isLoading) {
    return <ExecutionHistoryState message={messages.account.loading} />;
  }

  if (hasError || !history) {
    return <ExecutionHistoryState message={hasError ? messages.account.error : messages.account.executionHistoryNotFound} />;
  }

  const steps = history.actions.map((action) => ({ action: action.name, duration: action.minutes === null ? undefined : `${action.minutes}${messages.account.minuteUnit}`, memo: action.memo }));

  return (
    <section className="routine-execution-page">
      <RoutineExecutionHeader
        label={messages.account.tabs.executionHistory}
        onBack={() => navigate(-1)}
        phase="running"
        progressText={messages.account.executionDetail.executedActionCount.replace('{count}', String(history.actions.length))}
        title={history.routineTitle}
      />
      <main className="routine-execution-scroll">
        <div className="routine-execution-detail">
          {history.routineMemo !== null && <p className="routine-execution-detail__routine-memo">{history.routineMemo}</p>}
          <dl className="routine-execution-detail__metadata">
            <div><dt>{messages.account.executionDetail.executedAt}</dt><dd>{new Date(history.executedAt).toLocaleString('ja-JP')}</dd></div>
            <div><dt>{messages.account.executionDetail.postedAt}</dt><dd>{new Date(history.postedAt).toLocaleString('ja-JP')}</dd></div>
            <div><dt>{messages.account.executionDetail.supportCount}</dt><dd>{history.supportCount}</dd></div>
          </dl>
          {history.memo !== null && <section><h2>{messages.account.executionDetail.memo}</h2><p className="routine-execution-detail__memo">{history.memo}</p></section>}
          {history.tags.length > 0 && <section><h2>{messages.account.executionDetail.tags}</h2><div className="routine-execution-detail__tags">{history.tags.map((tag) => <span key={tag.id}>{tag.name}</span>)}</div></section>}
          <h2>{messages.account.executionDetail.actions}</h2>
          <RoutineExecutionStepList checked={steps.map(() => true)} onToggle={() => undefined} readOnly steps={steps} />
        </div>
      </main>
    </section>
  );
}

function ExecutionHistoryState({ message }: { message: string }) {
  return (
    <section className="routine-execution-page routine-execution-page--state">
      <p className="routine-execution-state">{message}</p>
    </section>
  );
}
