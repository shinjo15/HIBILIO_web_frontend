import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { RoutineExecutionHeader } from '../../routineExecution/components/RoutineExecutionHeader';
import { RoutineExecutionStepList } from '../../routineExecution/components/RoutineExecutionStepList';
import type { RoutineExecutionViewModel } from '../../routineExecution/domain/routineExecution';
import { routineExecutionService, type RoutineExecutionService } from '../../routineExecution/services/routineExecutionService';
import type { AccountExecutionHistory } from '../domain/account';
import { accountService, type AccountService } from '../services/accountService';
import '../../routineExecution/routineExecution.css';

type AccountExecutionHistoryPageProps = {
  accountService?: AccountService;
  routineExecutionService?: RoutineExecutionService;
};

export function AccountExecutionHistoryPage({
  accountService: historyService = accountService,
  routineExecutionService: executionService = routineExecutionService,
}: AccountExecutionHistoryPageProps) {
  const navigate = useNavigate();
  const { executionId = '', routineId = '' } = useParams<{ executionId: string; routineId: string }>();
  const [history, setHistory] = useState<AccountExecutionHistory | null>(null);
  const [steps, setSteps] = useState<RoutineExecutionViewModel['steps'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([historyService.getExecutionHistory(executionId), executionService.get(routineId)])
      .then(([loadedHistory, routine]) => {
        if (cancelled) {
          return;
        }

        if (!loadedHistory || !routine || loadedHistory.routineId !== routineId) {
          setHistory(null);
          setSteps(null);
          return;
        }

        setHistory(loadedHistory);
        setSteps(routine.steps);
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
  }, [executionId, historyService, routineId, executionService]);

  if (isLoading) {
    return <ExecutionHistoryState message={messages.account.loading} />;
  }

  if (hasError || !history || !steps) {
    return <ExecutionHistoryState message={hasError ? messages.account.error : messages.account.executionHistoryNotFound} />;
  }

  const checked = steps.map((_, index) => history.completedActionIndexes.includes(index));

  return (
    <section className="routine-execution-page">
      <RoutineExecutionHeader
        achieved={history.achievedActions}
        label={messages.account.tabs.executionHistory}
        onBack={() => navigate('/account')}
        phase="running"
        title={history.routineTitle}
        total={history.totalActions}
      />
      <main className="routine-execution-scroll">
        <p className="routine-execution-instruction">{messages.account.executionHistoryDescription}</p>
        <RoutineExecutionStepList checked={checked} onToggle={() => undefined} readOnly steps={steps} />
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
