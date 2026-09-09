import { useEffect, useState } from 'react';
import messages from '../../../shared/message/message.json';
import { routineExecutionFormSchema, type RoutineExecutionViewModel } from '../domain/routineExecution';
import {
  routineExecutionService,
  RoutineExecutionError,
  type RoutineExecutionService,
} from '../services/routineExecutionService';

export type RoutineExecutionLoadStatus = 'loading' | 'ready' | 'notFound' | 'error';

export function useRoutineExecution(
  routineId: string,
  service: RoutineExecutionService = routineExecutionService,
) {
  const [routine, setRoutine] = useState<RoutineExecutionViewModel | null>(null);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<RoutineExecutionLoadStatus>('loading');
  const [checked, setChecked] = useState<boolean[]>([]);
  const [memo, setMemo] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    service.get(routineId).then((loadedRoutine) => {
      if (cancelled) {
        return;
      }

      setLoadedRoutineId(routineId);
      if (!loadedRoutine) {
        setRoutine(null);
        setLoadStatus('notFound');
        return;
      }

      setRoutine(loadedRoutine);
      setChecked(new Array(loadedRoutine.steps.length).fill(false));
      setMemo('');
      setIsCompleted(false);
      setErrorMessage(null);
      setIsSubmitting(false);
      setLoadStatus('ready');
    }).catch(() => {
      if (!cancelled) {
        setLoadedRoutineId(routineId);
        setRoutine(null);
        setLoadStatus('error');
      }
    });

    return () => {
      // This hook is page-scoped, so leaving the route unmounts it and discards
      // all unsubmitted progress, including the optional comment.
      cancelled = true;
    };
  }, [routineId, service]);

  function toggleStep(index: number) {
    if (isCompleted || isSubmitting) {
      return;
    }

    setChecked((current) => current.map((value, currentIndex) => (
      currentIndex === index ? !value : value
    )));
    setErrorMessage(null);
  }

  function updateMemo(value: string) {
    setMemo(value);
    setErrorMessage(null);
  }

  async function create(): Promise<void> {
    if (!routine || isSubmitting) {
      return;
    }

    const executedRoutineActionIdentifiers = routine.steps
      .filter((_, index) => checked[index])
      .flatMap((step) => step.id === undefined ? [] : [step.id]);
    const form = routineExecutionFormSchema.safeParse({
      executedRoutineActionIdentifiers,
      memo,
      routineIdentifier: routine.id,
    });

    if (!form.success) {
      setErrorMessage(form.error.issues[0]?.message ?? messages.routineExecution.error);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await service.create(form.data);
      setIsCompleted(true);
    } catch (error) {
      setErrorMessage(error instanceof RoutineExecutionError
        ? error.message
        : messages.routineExecution.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    checked,
    create,
    errorMessage,
    isLoading: loadedRoutineId !== routineId || loadStatus === 'loading',
    isSubmitting,
    loadStatus,
    isCompleted,
    memo,
    routine,
    toggleStep,
    updateMemo,
  };
}
