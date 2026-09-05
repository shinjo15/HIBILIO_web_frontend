import messages from '../../../shared/message/message.json';
import type { RoutineExecutionResultViewModel } from '../domain/routineExecution';

type RoutineExecutionResultProps = {
  onHome: () => void;
  result: RoutineExecutionResultViewModel;
  title: string;
};

export function RoutineExecutionResult({ onHome, result, title }: RoutineExecutionResultProps) {
  return (
    <main className="routine-execution-result">
      <div aria-hidden="true" className="routine-execution-result__mark"><CheckIcon /></div>
      <h1>{messages.routineExecution.resultTitle}</h1>
      <p className="routine-execution-result__description">{messages.routineExecution.resultDescription}</p>

      <section className="routine-execution-result__card">
        <p className="routine-execution-result__routine-title">{title}</p>
        <div className="routine-execution-result__metrics">
          <div>
            <span>{messages.routineExecution.achieved}</span>
            <strong>{result.achieved}<small> / {result.total}</small></strong>
          </div>
          <div>
            <span>{messages.routineExecution.duration}</span>
            <strong>{result.elapsedMinutes}<small> {messages.routineExecution.minuteUnit}</small></strong>
          </div>
        </div>
        {result.comment && <p className="routine-execution-result__comment">「{result.comment}」</p>}
      </section>

      <button className="routine-execution-main-action" onClick={onHome} type="button">{messages.routineExecution.backToHome}</button>
    </main>
  );
}

function CheckIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
}
