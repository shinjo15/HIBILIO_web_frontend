import messages from '../../../shared/message/message.json';
import type { RoutineExecutionStepViewModel } from '../domain/routineExecution';

type RoutineExecutionStepListProps = {
  checked: boolean[];
  onToggle: (index: number) => void;
  readOnly?: boolean;
  steps: RoutineExecutionStepViewModel[];
};

export function RoutineExecutionStepList({ checked, onToggle, readOnly = false, steps }: RoutineExecutionStepListProps) {
  return (
    <div className="routine-execution-steps">
      {steps.map((step, index) => (
        <button
          aria-pressed={checked[index] ?? false}
          className={checked[index] ? 'routine-execution-step routine-execution-step--checked' : 'routine-execution-step'}
          disabled={readOnly}
          key={`${index}-${step.action}`}
          onClick={() => { if (!readOnly) { onToggle(index); } }}
          type="button"
        >
          <span className="routine-execution-step__check"><CheckIcon /></span>
          <span className="routine-execution-step__body">
            <span className="routine-execution-step__title">
              <span>{step.action}</span>
            </span>
            {step.duration && <span className="routine-execution-step__duration">{step.duration}</span>}
          </span>
          <span className="sr-only">{checked[index] ? messages.routineExecution.stepCompleted : messages.routineExecution.stepIncomplete}</span>
        </button>
      ))}
    </div>
  );
}

function CheckIcon() {
  return <svg aria-hidden="true" className="routine-execution-check-icon" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>;
}
