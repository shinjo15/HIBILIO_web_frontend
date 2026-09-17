import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { RoutineExecutionComment } from '../../routineExecution/components/RoutineExecutionComment';
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

  const steps = history.actions.map((action) => ({ action: action.name, duration: action.minutes === null ? undefined : `${action.minutes}${messages.account.minuteUnit}` }));

  return (
    <section className="routine-execution-page">
      <RoutineExecutionHeader
        achieved={steps.length}
        onBack={() => navigate(-1)}
        title={history.routineTitle}
        total={steps.length}
      />
      <main className="routine-execution-scroll">
        <p className="routine-execution-instruction">{messages.routineExecution.readyDescription}</p>
        <RoutineExecutionStepList checked={steps.map(() => true)} onToggle={() => undefined} readOnly steps={steps} />
        <RoutineExecutionComment memo={history.memo ?? ''} onChange={() => undefined} readOnly />
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
