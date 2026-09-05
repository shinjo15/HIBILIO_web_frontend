import messages from '../../../shared/message/message.json';
import type { RoutineExecutionStepViewModel } from '../domain/routineExecution';

type RoutineExecutionStepListProps = {
  checked: boolean[];
  onToggle: (index: number) => void;
  steps: RoutineExecutionStepViewModel[];
};

export function RoutineExecutionStepList({ checked, onToggle, steps }: RoutineExecutionStepListProps) {
  return (
    <div className="routine-execution-steps">
      {steps.map((step, index) => (
        <button
          aria-pressed={checked[index] ?? false}
          className={checked[index] ? 'routine-execution-step routine-execution-step--checked' : 'routine-execution-step'}
          key={`${step.time}-${step.action}`}
          onClick={() => onToggle(index)}
          type="button"
        >
          <span className="routine-execution-step__check"><CheckIcon /></span>
          <span className="routine-execution-step__body">
            <span className="routine-execution-step__title">
              <span className="routine-execution-step__time">{step.time}</span>
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
  return <svg aria-hidden="true" className="routine-execution-check-icon" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}
