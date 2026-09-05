import { useEffect, useState } from 'react';
import messages from '../../../shared/message/message.json';
import {
  calculateElapsedMinutes,
  countAchievedSteps,
  type RoutineExecutionResult,
  type RoutineExecutionResultViewModel,
  type RoutineExecutionViewModel,
} from '../domain/routineExecution';
import {
  routineExecutionService,
  RoutineExecutionError,
  type RoutineExecutionService,
} from '../services/routineExecutionService';

export type RoutineExecutionPhase = 'ready' | 'running' | 'completed';
export type RoutineExecutionLoadStatus = 'loading' | 'ready' | 'notFound' | 'error';

export function useRoutineExecution(
  routineId: string,
  service: RoutineExecutionService = routineExecutionService,
) {
  const [routine, setRoutine] = useState<RoutineExecutionViewModel | null>(null);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<RoutineExecutionLoadStatus>('loading');
  const [phase, setPhase] = useState<RoutineExecutionPhase>('ready');
  const [checked, setChecked] = useState<boolean[]>([]);
  const [comment, setComment] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<RoutineExecutionResultViewModel | null>(null);
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
      setPhase('ready');
      setChecked(new Array(loadedRoutine.steps.length).fill(false));
      setComment('');
      setStartedAt(null);
      setResult(null);
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

  function start() {
    if (phase !== 'ready') {
      return;
    }

    setStartedAt(Date.now());
    setPhase('running');
    setErrorMessage(null);
  }

  function toggleStep(index: number) {
    if (phase === 'ready') {
      start();
    }

    if (phase === 'completed' || isSubmitting) {
      return;
    }

    setChecked((current) => current.map((value, currentIndex) => (
      currentIndex === index ? !value : value
    )));
    setErrorMessage(null);
  }

  function updateComment(value: string) {
    setComment(value);
    setErrorMessage(null);
  }

  async function complete(): Promise<void> {
    if (phase !== 'running' || !routine || startedAt === null || isSubmitting) {
      return;
    }

    const result: RoutineExecutionResult = {
      achieved: countAchievedSteps(checked),
      comment: comment.trim(),
      elapsedMinutes: calculateElapsedMinutes(startedAt, Date.now()),
      routineId: routine.id,
      total: routine.steps.length,
    };

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const completed = await service.complete(result);
      setResult(completed);
      setPhase('completed');
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
    comment,
    complete,
    errorMessage,
    isLoading: loadedRoutineId !== routineId || loadStatus === 'loading',
    isSubmitting,
    loadStatus,
    phase,
    result,
    routine,
    start,
    toggleStep,
    updateComment,
  };
}
