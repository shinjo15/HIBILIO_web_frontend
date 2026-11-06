import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import messages from '../../../shared/message/message.json';
import type {
  RoutineCreateActionViewModel,
  RoutineCreateViewModel,
} from '../domain/routineCreate';
import type { RoutineCreateTag } from '../services/routineCreateService';

type RoutineCreateFormProps = {
  errorMessage: string | null;
  form: RoutineCreateViewModel;
  isSubmitting: boolean;
  onAddAction: () => void;
  onMoveAction: (index: number, direction: -1 | 1) => void;
  onRemoveAction: (index: number) => void;
  onRetryTagLoad: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleTag: (tag: RoutineCreateTag) => void;
  onUpdateTagQuery: (value: string) => void;
  onUpdateAction: (index: number, field: keyof RoutineCreateActionViewModel, value: string) => void;
  onUpdateField: (field: Exclude<keyof RoutineCreateViewModel, 'actions' | 'tagIdentifiers'>, value: string) => void;
  tagCandidates: RoutineCreateTag[];
  tagLoadError: string | null;
  tagQuery: string;
};

export function RoutineCreateForm({
  errorMessage,
  form,
  isSubmitting,
  onAddAction,
  onMoveAction,
  onRemoveAction,
  onRetryTagLoad,
  onSubmit,
  onToggleTag,
  onUpdateTagQuery,
  onUpdateAction,
  onUpdateField,
  tagCandidates,
  tagLoadError,
  tagQuery,
}: RoutineCreateFormProps) {
  const isComposingTagQuery = useRef(false);
  const pendingTagQuery = useRef('');
  const [tagQueryInput, setTagQueryInput] = useState(tagQuery);

  useEffect(() => {
    if (!isComposingTagQuery.current) {
      setTagQueryInput(tagQuery);
    }
  }, [tagQuery]);
  return (
    <form className="routine-create-form" id="routine-create-form" noValidate onSubmit={onSubmit}>
      {errorMessage !== null && <p className="routine-create-form__error" role="alert">{errorMessage}</p>}

      <div className="routine-create-field">
        <label className="routine-create-field__label" htmlFor="routine-name">
          {messages.routineCreate.routineName} <span aria-hidden="true" className="routine-create-required">*</span>
        </label>
        <input
          autoComplete="off"
          className="routine-create-input"
          id="routine-name"
          maxLength={50}
          onChange={(event) => onUpdateField('routineName', event.target.value)}
          placeholder={messages.routineCreate.routineNamePlaceholder}
          type="text"
          value={form.routineName}
        />
      </div>

      <div className="routine-create-field">
        <label className="routine-create-field__label" htmlFor="routine-memo">{messages.routineCreate.routineMemo}</label>
        <textarea
          className="routine-create-input routine-create-input--textarea"
          id="routine-memo"
          maxLength={300}
          onChange={(event) => onUpdateField('routineMemo', event.target.value)}
          placeholder={messages.routineCreate.routineMemoPlaceholder}
          rows={3}
          value={form.routineMemo}
        />
      </div>

      <div className="routine-create-field routine-create-field--duration">
        <label className="routine-create-field__label" htmlFor="routine-execution-minutes">{messages.routineCreate.routineExecutionMinutes}</label>
        <div className="routine-create-duration-input">
          <input
            className="routine-create-input routine-create-input--number"
            id="routine-execution-minutes"
            inputMode="numeric"
            min={1}
            onChange={(event) => onUpdateField('routineExecutionMinutes', event.target.value)}
            placeholder={messages.routineCreate.routineExecutionMinutesPlaceholder}
            type="text"
            value={form.routineExecutionMinutes}
          />
          <span aria-hidden="true">{messages.routineCreate.minuteUnit}</span>
        </div>
      </div>

      <fieldset className="routine-create-tags">
        <legend className="routine-create-field__label">{messages.routineCreate.tags}</legend>
        <input aria-label={messages.routineCreate.tagSearchPlaceholder} className="routine-create-input" onChange={(event) => { const value = event.target.value; setTagQueryInput(value); if (isComposingTagQuery.current) { pendingTagQuery.current = value; return; } onUpdateTagQuery(value); }} onCompositionEndCapture={() => { isComposingTagQuery.current = false; const value = pendingTagQuery.current; setTagQueryInput(value); onUpdateTagQuery(value); pendingTagQuery.current = ''; }} onCompositionStartCapture={() => { isComposingTagQuery.current = true; pendingTagQuery.current = tagQueryInput; }} placeholder={messages.routineCreate.tagSearchPlaceholder} type="search" value={tagQueryInput} />
        {tagLoadError !== null && <div className="routine-create-tags__error" role="alert"><span>{tagLoadError}</span><button onClick={onRetryTagLoad} type="button">{messages.routineCreate.retryTagLoad}</button></div>}
        <div className="routine-create-tags__list">
          {tagCandidates.map((tag) => {
            const selected = (form.tagIdentifiers ?? []).includes(tag.identifier);
            return <button aria-label={`${tag.label}${selected ? messages.routineCreate.removeTag : messages.routineCreate.selectTag}`} className={selected ? 'is-selected' : ''} key={tag.identifier} onClick={() => onToggleTag(tag)} type="button">{tag.label}</button>;
          })}
        </div>
      </fieldset>

      <fieldset className="routine-create-actions">
        <legend className="routine-create-field__label">
          {messages.routineCreate.actions} <span aria-hidden="true" className="routine-create-required">*</span>
        </legend>
        <div className="routine-create-actions__list">
          {form.actions.map((action, index) => (
            <RoutineCreateAction
              action={action}
              index={index}
              isFirst={index === 0}
              isLast={index === form.actions.length - 1}
              isSubmitting={isSubmitting}
              key={`routine-action-${index}`}
              onMove={onMoveAction}
              onRemove={onRemoveAction}
              onUpdate={onUpdateAction}
              showRemove={form.actions.length > 1}
            />
          ))}
        </div>
        <button className="routine-create-add-action" disabled={isSubmitting} onClick={onAddAction} type="button">
          <PlusIcon />
          {messages.routineCreate.addAction}
        </button>
      </fieldset>

    </form>
  );
}

type RoutineCreateActionProps = {
  action: RoutineCreateActionViewModel;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof RoutineCreateActionViewModel, value: string) => void;
  showRemove: boolean;
};

function RoutineCreateAction({
  action,
  index,
  isFirst,
  isLast,
  isSubmitting,
  onMove,
  onRemove,
  onUpdate,
  showRemove,
}: RoutineCreateActionProps) {
  return (
    <article className="routine-create-action">
      <div className="routine-create-action__header">
        <span aria-hidden="true" className="routine-create-action__number">{index + 1}</span>
        <label className="routine-create-sr-only" htmlFor={`routine-action-minutes-${index}`}>
          {messages.routineCreate.actionMinutes}
        </label>
        <div className="routine-create-action__duration-input">
          <input
            className="routine-create-input routine-create-input--number"
            id={`routine-action-minutes-${index}`}
            inputMode="numeric"
            min={1}
            onChange={(event) => onUpdate(index, 'actionMinutes', event.target.value)}
            placeholder={messages.routineCreate.actionMinutesPlaceholder}
            type="text"
            value={action.actionMinutes}
          />
          <span aria-hidden="true" className="routine-create-action__duration-unit">{messages.routineCreate.minuteUnit}</span>
        </div>
        <div className="routine-create-action__controls">
          <button
            aria-label={`${messages.routineCreate.moveActionUp} ${index + 1}`}
            className="routine-create-icon-button"
            disabled={isFirst || isSubmitting}
            onClick={() => onMove(index, -1)}
            type="button"
          >
            <ArrowUpIcon />
          </button>
          <button
            aria-label={`${messages.routineCreate.moveActionDown} ${index + 1}`}
            className="routine-create-icon-button"
            disabled={isLast || isSubmitting}
            onClick={() => onMove(index, 1)}
            type="button"
          >
            <ArrowDownIcon />
          </button>
          {showRemove && (
            <button
              aria-label={`${messages.routineCreate.removeAction} ${index + 1}`}
              className="routine-create-icon-button routine-create-icon-button--danger"
              disabled={isSubmitting}
              onClick={() => onRemove(index)}
              type="button"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      <div className="routine-create-action__field">
        <label className="routine-create-sr-only" htmlFor={`routine-action-name-${index}`}>
          {messages.routineCreate.actionName}
        </label>
        <input
          className="routine-create-input"
          id={`routine-action-name-${index}`}
          maxLength={50}
          onChange={(event) => onUpdate(index, 'actionName', event.target.value)}
          placeholder={messages.routineCreate.actionNamePlaceholder}
          type="text"
          value={action.actionName}
        />
      </div>

      <div className="routine-create-action__field">
        <label className="routine-create-sr-only" htmlFor={`routine-action-memo-${index}`}>
          {messages.routineCreate.actionMemo}
        </label>
        <textarea
            className="routine-create-input routine-create-input--textarea routine-create-input--compact"
            id={`routine-action-memo-${index}`}
            maxLength={300}
            onChange={(event) => onUpdate(index, 'actionMemo', event.target.value)}
            placeholder={messages.routineCreate.actionMemoPlaceholder}
            rows={2}
            value={action.actionMemo}
        />
      </div>
    </article>
  );
}

function PlusIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="20" viewBox="0 0 24 24" width="20"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function ArrowUpIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="18" viewBox="0 0 24 24" width="18"><path d="m6 15 6-6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function ArrowDownIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="18" viewBox="0 0 24 24" width="18"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" className="routine-create-icon" fill="none" height="18" viewBox="0 0 24 24" width="18"><path d="M3 6h18M19 6l-1 14H6L5 6m5 5v6m4-6v6M9 6l1-3h4l1 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
