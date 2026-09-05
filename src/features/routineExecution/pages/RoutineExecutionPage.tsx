import { useNavigate, useParams } from 'react-router-dom';
import messages from '../../../shared/message/message.json';
import { countAchievedSteps } from '../domain/routineExecution';
import { RoutineExecutionComment } from '../components/RoutineExecutionComment';
import { RoutineExecutionHeader } from '../components/RoutineExecutionHeader';
import { RoutineExecutionResult } from '../components/RoutineExecutionResult';
import { RoutineExecutionStepList } from '../components/RoutineExecutionStepList';
import { useRoutineExecution } from '../hooks/useRoutineExecution';
import { routineExecutionService, type RoutineExecutionService } from '../services/routineExecutionService';
import '../routineExecution.css';

type RoutineExecutionPageProps = {
  service?: RoutineExecutionService;
};

export function RoutineExecutionPage({ service = routineExecutionService }: RoutineExecutionPageProps) {
  const navigate = useNavigate();
  const { routineId = '' } = useParams<{ routineId: string }>();
  const execution = useRoutineExecution(routineId, service);

  function goBack() {
    navigate(`/routines/${routineId}`);
  }

  if (execution.isLoading) {
    return <ExecutionState message={messages.routineExecution.loading} />;
  }

  if (execution.loadStatus === 'error') {
    return <ExecutionState message={messages.routineExecution.error} />;
  }

  if (execution.loadStatus === 'notFound' || !execution.routine) {
    return <ExecutionState message={messages.routineExecution.notFound} />;
  }

  if (execution.phase === 'completed' && execution.result) {
    return (
      <section className="routine-execution-page routine-execution-page--result">
        <RoutineExecutionResult
          onHome={() => navigate('/')}
          result={execution.result}
          title={execution.routine.title}
        />
      </section>
    );
  }

  const achieved = countAchievedSteps(execution.checked);
  const total = execution.routine.steps.length;

  return (
    <section className="routine-execution-page">
      <RoutineExecutionHeader
        achieved={achieved}
        onBack={goBack}
        phase={execution.phase}
        title={execution.routine.title}
        total={total}
      />
      <main className="routine-execution-scroll">
        {execution.phase === 'ready' && <p className="routine-execution-instruction">{messages.routineExecution.readyDescription}</p>}
        <RoutineExecutionStepList checked={execution.checked} onToggle={execution.toggleStep} steps={execution.routine.steps} />
        {execution.phase === 'running' && <RoutineExecutionComment comment={execution.comment} onChange={execution.updateComment} />}
        {execution.errorMessage && <p aria-live="polite" className="routine-execution-error" role="alert">{execution.errorMessage}</p>}
      </main>
      <div className="routine-execution-action-bar">
        <button
          className="routine-execution-main-action"
          disabled={execution.isSubmitting}
          onClick={execution.phase === 'ready' ? execution.start : () => void execution.complete()}
          type="button"
        >
          {execution.isSubmitting ? messages.routineExecution.completing : execution.phase === 'ready' ? messages.routineExecution.start : messages.routineExecution.finish}
        </button>
      </div>
    </section>
  );
}

function ExecutionState({ message }: { message: string }) {
  return (
    <section className="routine-execution-page routine-execution-page--state">
      <p className="routine-execution-state">{message}</p>
    </section>
  );
}
