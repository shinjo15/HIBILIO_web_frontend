import { useRef, useState } from 'react';
import messages from '../../../shared/message/message.json';
import {
  createEmptyAction,
  ensureRoutineCreateActionClientIds,
  createInitialRoutineCreateViewModel,
  reorderRoutineCreateActions,
  validateRoutineCreateForm,
  type RoutineCreateActionViewModel,
  type RoutineCreateViewModel,
} from '../domain/routineCreate';
import {
  RoutineCreateApiError,
  RoutineCreateUnauthorizedError,
  routineCreateService,
  type RoutineCreateService,
} from '../services/routineCreateService';

export type RoutineCreateStatus = 'idle' | 'submitting' | 'loading' | 'success' | 'error';

const loadingDelayMilliseconds = 500;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => { window.setTimeout(resolve, milliseconds); });
}

export function useRoutineCreate(service: RoutineCreateService = routineCreateService, initialForm?: RoutineCreateViewModel) {
  const [form, setForm] = useState<RoutineCreateViewModel>(() => ensureRoutineCreateActionClientIds(initialForm ?? createInitialRoutineCreateViewModel()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [status, setStatus] = useState<RoutineCreateStatus>('idle');
  const isSubmittingRef = useRef(false);

  function updateField(field: Exclude<keyof RoutineCreateViewModel, 'actions' | 'tagIdentifiers'>, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'videoUrl') {
      setFieldErrors((current) => removeFieldError(current, 'video_url'));
    }
    setErrorMessage(null);
    setStatus((current) => current === 'error' ? 'idle' : current);
  }

  function updateAction(index: number, field: keyof RoutineCreateActionViewModel, value: string) {
    const actionClientId = form.actions[index]?.clientId;
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) => (
        actionIndex === index ? { ...action, [field]: value } : action
      )),
    }));
    if (field === 'videoUrl') {
      setFieldErrors((current) => actionClientId === undefined
        ? current
        : removeFieldError(current, `routine_actions.${actionClientId}.video_url`));
    }
    setErrorMessage(null);
    setStatus((current) => current === 'error' ? 'idle' : current);
  }

  function addAction() {
    setForm((current) => ({ ...current, actions: [...current.actions, createEmptyAction()] }));
  }

  function removeAction(index: number) {
    const actionClientId = form.actions[index]?.clientId;
    setForm((current) => current.actions.length <= 1
      ? current
      : { ...current, actions: current.actions.filter((_, actionIndex) => actionIndex !== index) });
    if (actionClientId !== undefined) {
      setFieldErrors((current) => removeFieldError(current, `routine_actions.${actionClientId}.video_url`));
    }
    setErrorMessage(null);
  }

  function moveAction(index: number, direction: -1 | 1) {
    setForm((current) => ({
      ...current,
      actions: reorderRoutineCreateActions(current.actions, index, index + direction),
    }));
    setErrorMessage(null);
  }

  function toggleTag(identifier: string) {
    setForm((current) => {
      const tagIdentifiers = current.tagIdentifiers ?? [];
      return {
        ...current,
        tagIdentifiers: tagIdentifiers.includes(identifier)
          ? tagIdentifiers.filter((tagIdentifier) => tagIdentifier !== identifier)
          : [...tagIdentifiers, identifier],
      };
    });
  }

  async function submit(): Promise<void> {
    if (isSubmittingRef.current) return;

    const validation = validateRoutineCreateForm(form);
    const submittedActionClientIds = form.actions.map((action) => action.clientId);

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? messages.routineCreate.validation.generic);
      setStatus('error');
      return;
    }

    isSubmittingRef.current = true;
    setErrorMessage(null);
    setStatus('submitting');

    try {
      let loadingShown = false;
      const loadingTimer = window.setTimeout(() => {
        loadingShown = true;
        setStatus('loading');
      }, loadingDelayMilliseconds);
      let requestError: unknown;

      try {
        await service.create(validation.data);
      } catch (error) {
        requestError = error;
      }

      if (!loadingShown) {
        window.clearTimeout(loadingTimer);
      } else {
        await wait(loadingDelayMilliseconds);
      }

      if (requestError !== undefined) {
        throw requestError;
      }

      setStatus('success');
    } catch (error) {
      isSubmittingRef.current = false;
      if (error instanceof RoutineCreateUnauthorizedError) {
        setIsUnauthorized(true);
        setErrorMessage(null);
        setStatus('error');
        return;
      }
      if (error instanceof RoutineCreateApiError) {
        const { fieldErrors: renderableFieldErrors, hasUnrenderableFieldError } = mapApiFieldErrors(
          error.fieldErrors,
          submittedActionClientIds,
        );
        setFieldErrors(renderableFieldErrors);
        setErrorMessage(hasUnrenderableFieldError || Object.keys(renderableFieldErrors).length === 0 ? error.message : null);
      } else {
        setErrorMessage(messages.routineCreate.error);
      }
      setStatus('error');
    }
  }

  return {
    addAction,
    errorMessage,
    fieldErrors,
    form,
    isUnauthorized,
    moveAction,
    removeAction,
    status,
    submit,
    toggleTag,
    updateAction,
    updateField,
  };
}

function removeFieldError(fieldErrors: Record<string, string>, field: string): Record<string, string> {
  const remaining = { ...fieldErrors };
  delete remaining[field];
  return remaining;
}

function mapApiFieldErrors(
  fieldErrors: Record<string, string>,
  submittedActionClientIds: Array<string | undefined>,
): { fieldErrors: Record<string, string>; hasUnrenderableFieldError: boolean } {
  const renderableFieldErrors: Record<string, string> = {};
  let hasUnrenderableFieldError = false;

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (field === 'video_url') {
      renderableFieldErrors[field] = message;
      continue;
    }

    const actionVideoUrlError = /^routine_actions\.(\d+)\.video_url$/.exec(field);
    const actionClientId = actionVideoUrlError === null ? undefined : submittedActionClientIds[Number(actionVideoUrlError[1])];
    if (actionClientId === undefined) {
      hasUnrenderableFieldError = true;
      continue;
    }

    renderableFieldErrors[`routine_actions.${actionClientId}.video_url`] = message;
  }

  return { fieldErrors: renderableFieldErrors, hasUnrenderableFieldError };
}
