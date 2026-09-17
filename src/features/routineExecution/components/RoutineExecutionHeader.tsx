import messages from '../../../shared/message/message.json';


type RoutineExecutionHeaderProps = {
  achieved?: number;
  label?: string;
  onBack: () => void;
  phase?: string;
  progressText?: string;
  title: string;
  total?: number;
};

export function RoutineExecutionHeader({ achieved, label = messages.routineExecution.runningLabel, onBack, progressText, title, total }: RoutineExecutionHeaderProps) {
  const defaultProgress = achieved !== undefined && total !== undefined ? `${achieved}/${total} ${messages.routineExecution.completedUnit}` : '';

  return (
    <header className="routine-execution-header">
      <button aria-label={messages.routineExecution.cancel} className="routine-execution-header__back" onClick={onBack} type="button">
        <CloseIcon />
      </button>
      <div className="routine-execution-header__title">
        <p>{label}</p>
        <h1>{title}</h1>
      </div>
      <span className="routine-execution-header__progress">{progressText ?? defaultProgress}</span>
    </header>
  );
}

function CloseIcon() {
  return <svg aria-hidden="true" className="routine-execution-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24"><line x1="6" x2="18" y1="6" y2="18" /><line x1="18" x2="6" y1="6" y2="18" /></svg>;
}
