import messages from '../../../shared/message/message.json';

type RoutineExecutionCommentProps = {
  memo: string;
  onChange: (value: string) => void;
};

export function RoutineExecutionComment({ memo, onChange }: RoutineExecutionCommentProps) {
  return (
    <div className="routine-execution-comment">
      <label htmlFor="routine-execution-comment-input">{messages.routineExecution.commentLabel}</label>
      <input
        id="routine-execution-comment-input"
        onChange={(event) => onChange(event.target.value)}
        placeholder={messages.routineExecution.commentPlaceholder}
        type="text"
        value={memo}
      />
    </div>
  );
}
