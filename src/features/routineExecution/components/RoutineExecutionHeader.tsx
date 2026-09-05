import messages from '../../../shared/message/message.json';
import type { RoutineExecutionPhase } from '../hooks/useRoutineExecution';

type RoutineExecutionHeaderProps = {
  achieved: number;
  onBack: () => void;
  phase: RoutineExecutionPhase;
  title: string;
  total: number;
};

export function RoutineExecutionHeader({ achieved, onBack, phase, title, total }: RoutineExecutionHeaderProps) {
  return (
    <header className="routine-execution-header">
      <button aria-label={messages.routineExecution.backToDetail} className="routine-execution-header__back" onClick={onBack} type="button">
        <BackIcon />
      </button>
      <div className="routine-execution-header__title">
        <p>{messages.routineExecution.runningLabel}</p>
        <h1>{title}</h1>
      </div>
      {phase === 'running' && (
        <span className="routine-execution-header__progress">{achieved}/{total} {messages.routineExecution.completedUnit}</span>
      )}
    </header>
  );
}

function BackIcon() {
  return <svg aria-hidden="true" className="routine-execution-icon" fill="none" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>;
}
