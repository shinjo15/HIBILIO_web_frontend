import messages from '../../../shared/message/message.json';

type RoutineExecutionCommentProps = {
  memo: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function RoutineExecutionComment({ memo, onChange, readOnly = false }: RoutineExecutionCommentProps) {
  return (
    <div className="routine-execution-comment">
      <label htmlFor="routine-execution-comment-input">{messages.routineExecution.commentLabel}</label>
      <input
        id="routine-execution-comment-input"
        maxLength={62}
        onChange={(event) => onChange(Array.from(event.target.value).slice(0, 31).join(''))}
        placeholder={messages.routineExecution.commentPlaceholder}
        readOnly={readOnly}
        type="text"
        value={memo}
      />
    </div>
  );
}
