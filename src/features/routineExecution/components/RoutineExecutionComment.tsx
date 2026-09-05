import messages from '../../../shared/message/message.json';

type RoutineExecutionCommentProps = {
  comment: string;
  onChange: (value: string) => void;
};

export function RoutineExecutionComment({ comment, onChange }: RoutineExecutionCommentProps) {
  return (
    <div className="routine-execution-comment">
      <label htmlFor="routine-execution-comment-input">{messages.routineExecution.commentLabel}</label>
      <input
        id="routine-execution-comment-input"
        maxLength={300}
        onChange={(event) => onChange(event.target.value)}
        placeholder={messages.routineExecution.commentPlaceholder}
        type="text"
        value={comment}
      />
    </div>
  );
}
