import { useState } from 'react';
import messages from '../../../shared/message/message.json';
import {
  createEmptyAction,
  createInitialRoutineCreateViewModel,
  reorderRoutineCreateActions,
  validateRoutineCreateForm,
  type RoutineCreateActionViewModel,
  type RoutineCreateViewModel,
} from '../domain/routineCreate';
import {
  RoutineCreateApiError,
  routineCreateService,
  type RoutineCreateService,
} from '../services/routineCreateService';

export type RoutineCreateStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useRoutineCreate(service: RoutineCreateService = routineCreateService) {
  const [form, setForm] = useState<RoutineCreateViewModel>(createInitialRoutineCreateViewModel);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<RoutineCreateStatus>('idle');

  function updateField(field: keyof Omit<RoutineCreateViewModel, 'actions'>, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
    setStatus((current) => current === 'error' ? 'idle' : current);
  }

  function updateAction(index: number, field: keyof RoutineCreateActionViewModel, value: string) {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) => (
        actionIndex === index ? { ...action, [field]: value } : action
      )),
    }));
    setErrorMessage(null);
    setStatus((current) => current === 'error' ? 'idle' : current);
  }

  function addAction() {
    setForm((current) => ({ ...current, actions: [...current.actions, createEmptyAction()] }));
  }

  function removeAction(index: number) {
    setForm((current) => current.actions.length <= 1
      ? current
      : { ...current, actions: current.actions.filter((_, actionIndex) => actionIndex !== index) });
    setErrorMessage(null);
  }

  function moveAction(index: number, direction: -1 | 1) {
    setForm((current) => ({
      ...current,
      actions: reorderRoutineCreateActions(current.actions, index, index + direction),
    }));
    setErrorMessage(null);
  }

  async function submit(): Promise<void> {
    const validation = validateRoutineCreateForm(form);

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message ?? messages.routineCreate.validation.generic);
      setStatus('error');
      return;
    }

    setErrorMessage(null);
    setStatus('submitting');

    try {
      await service.create(validation.data);
      setStatus('success');
    } catch (error) {
      setErrorMessage(error instanceof RoutineCreateApiError ? error.message : messages.routineCreate.error);
      setStatus('error');
    }
  }

  return {
    addAction,
    errorMessage,
    form,
    moveAction,
    removeAction,
    status,
    submit,
    updateAction,
    updateField,
  };
}
