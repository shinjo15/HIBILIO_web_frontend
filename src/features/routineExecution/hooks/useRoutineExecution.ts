import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getAuthenticationGeneration, subscribeToAuthentication } from '../../auth/services/authSession';
import messages from '../../../shared/message/message.json';
import type { RoutineExecutionViewModel } from '../domain/routineExecution';
import { routineExecutionService, RoutineExecutionError, type RoutineExecutionService } from '../services/routineExecutionService';

export type RoutineExecutionLoadStatus = 'loading' | 'ready' | 'notFound' | 'error';

type FailedMutation = () => void;
type MutationQueue = {
  operations: Array<{ isCompletion: boolean; operation: () => Promise<void> }>;
  pending: number;
  promise: Promise<void>;
  stopped: boolean;
};

const emptyQueue = (): MutationQueue => ({ operations: [], pending: 0, promise: Promise.resolve(), stopped: false });

export function useRoutineExecution(routineId: string, service: RoutineExecutionService = routineExecutionService) {
  const authenticationGeneration = useSyncExternalStore(subscribeToAuthentication, getAuthenticationGeneration, getAuthenticationGeneration);
  const [routine, setRoutine] = useState<RoutineExecutionViewModel | null>(null);
  const [loadedRoutineId, setLoadedRoutineId] = useState<string | null>(null);
  const [loadedAuthenticationGeneration, setLoadedAuthenticationGeneration] = useState(-1);
  const [loadStatus, setLoadStatus] = useState<RoutineExecutionLoadStatus>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [memo, setMemo] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDraftMissing, setIsDraftMissing] = useState(false);
  const [isMutationBlocked, setIsMutationBlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [failedMutation, setFailedMutation] = useState<FailedMutation | null>(null);
  const queue = useRef<MutationQueue>(emptyQueue());
  const generation = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    const currentGeneration = generation.current + 1;
    generation.current = currentGeneration;
    mounted.current = true;
    queue.current = emptyQueue();
    let cancelled = false;

    async function load() {
      try {
        setLoadStatus('loading');
        const loadedRoutine = await service.get(routineId);
        if (cancelled || getAuthenticationGeneration() !== authenticationGeneration) return;
        setIsSaving(false);
        if (!loadedRoutine) {
          setRoutine(null);
          setLoadedRoutineId(routineId);
          setLoadedAuthenticationGeneration(authenticationGeneration);
          setLoadStatus('notFound');
          return;
        }

        const draft = await service.start(routineId);
        if (cancelled || getAuthenticationGeneration() !== authenticationGeneration) return;
        setRoutine(loadedRoutine);
        setChecked(loadedRoutine.steps.map((step) => step.id !== undefined && draft.executedRoutineActionIdentifiers.includes(step.id)));
        setMemo(draft.memo);
        setIsCompleted(false);
        setIsDraftMissing(false);
        setIsMutationBlocked(false);
        setErrorMessage(null);
        setFailedMutation(null);
        setIsSubmitting(false);
        setIsUnauthorized(false);
        setLoadedRoutineId(routineId);
        setLoadedAuthenticationGeneration(authenticationGeneration);
        setLoadStatus('ready');
      } catch (error) {
        if (cancelled || getAuthenticationGeneration() !== authenticationGeneration) return;
        setLoadedRoutineId(routineId);
        setLoadedAuthenticationGeneration(authenticationGeneration);
        setRoutine(null);
        if (error instanceof RoutineExecutionError && error.status === 401) {
          setIsUnauthorized(true);
          return;
        }
        setLoadStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (generation.current === currentGeneration) mounted.current = false;
    };
  }, [authenticationGeneration, loadAttempt, routineId, service]);

  function retryLoad() {
    setLoadAttempt((current) => current + 1);
  }

  function invalidateForUnauthorized(mutationGeneration: number) {
    if (!mounted.current || generation.current !== mutationGeneration) return;
    generation.current += 1;
    queue.current = emptyQueue();
    setIsSaving(false);
    setIsSubmitting(false);
    setIsMutationBlocked(true);
    setIsUnauthorized(true);
  }

  async function reconcileDraft(
    mutationGeneration: number,
    mutationAuthenticationGeneration: number,
    retry: FailedMutation,
    retryMessage: string,
  ): Promise<void> {
    try {
      const draft = await service.getDraft(routineId);
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      if (draft === null) {
        setIsDraftMissing(true);
        setErrorMessage(messages.routineExecution.completionUncertain);
        setFailedMutation(null);
        return;
      }
      setErrorMessage(retryMessage);
      setFailedMutation(() => retry);
    } catch (error) {
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      if (error instanceof RoutineExecutionError && error.status === 401) {
        invalidateForUnauthorized(mutationGeneration);
        return;
      }
      setErrorMessage(messages.routineExecution.completionUncertain);
      setFailedMutation(null);
    }
  }

  async function confirmCompletionOutcome(mutationGeneration: number, mutationAuthenticationGeneration: number): Promise<void> {
    try {
      await service.getDraft(routineId);
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      setErrorMessage(messages.routineExecution.completionUncertain);
      setFailedMutation(null);
    } catch (error) {
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      if (error instanceof RoutineExecutionError && error.status === 401) {
        invalidateForUnauthorized(mutationGeneration);
        return;
      }
      setErrorMessage(messages.routineExecution.completionUncertain);
      setFailedMutation(null);
    }
  }

  function executeMutation(operation: () => Promise<void>, isCompletion = false) {
    const mutationGeneration = generation.current;
    const mutationAuthenticationGeneration = authenticationGeneration;
    const mutationQueue = queue.current;
    if (mutationQueue.stopped || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;

    mutationQueue.operations.push({ isCompletion, operation });
    mutationQueue.pending += 1;
    setIsSaving(true);
    if (isCompletion) setIsSubmitting(true);
    const current = mutationQueue.promise.then(async () => {
      if (
        !mounted.current
        || generation.current !== mutationGeneration
        || mutationQueue.stopped
        || getAuthenticationGeneration() !== mutationAuthenticationGeneration
      ) return false;
      await operation();
      return true;
    });
    mutationQueue.promise = current.then(
      () => undefined,
      () => {
        mutationQueue.stopped = true;
      },
    );
    void current.then((performed) => {
      if (!performed || !mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      setErrorMessage(null);
      setFailedMutation(null);
      if (isCompletion) setIsCompleted(true);
    }).catch((error: unknown) => {
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      if (error instanceof RoutineExecutionError && error.status === 401) {
        invalidateForUnauthorized(mutationGeneration);
        return;
      }
      setIsMutationBlocked(true);
      if (isCompletion && !(error instanceof RoutineExecutionError && (error.status === 404 || error.status === 422))) {
        void confirmCompletionOutcome(mutationGeneration, mutationAuthenticationGeneration);
        return;
      }
      const retryableOperations = isCompletion
        ? [{ isCompletion, operation }]
        : mutationQueue.operations.filter(({ isCompletion: queuedCompletion }) => !queuedCompletion);
      const retry = () => {
        if (getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
        queue.current = emptyQueue();
        setIsMutationBlocked(false);
        retryableOperations.forEach(({ isCompletion: retryIsCompletion, operation: retryOperation }) => executeMutation(retryOperation, retryIsCompletion));
      };
      void reconcileDraft(
        mutationGeneration,
        mutationAuthenticationGeneration,
        retry,
        isCompletion || (error instanceof RoutineExecutionError && error.status === 404)
          ? messages.routineExecution.retryCompletion
          : error instanceof RoutineExecutionError ? error.message : messages.routineExecution.error,
      );
    }).finally(() => {
      mutationQueue.pending -= 1;
      if (!mounted.current || generation.current !== mutationGeneration || getAuthenticationGeneration() !== mutationAuthenticationGeneration) return;
      if (mutationQueue.pending === 0) setIsSaving(false);
      if (isCompletion) setIsSubmitting(false);
    });
  }

  function toggleStep(index: number) {
    if (!routine || isCompleted || isDraftMissing || isMutationBlocked || isSubmitting) return;
    const step = routine.steps[index];
    if (!step?.id) {
      setErrorMessage(messages.routineExecution.error);
      return;
    }
    const isExecuted = !checked[index];
    setChecked((current) => current.map((value, currentIndex) => currentIndex === index ? isExecuted : value));
    executeMutation(() => service.updateAction(routineId, step.id!, isExecuted));
  }

  function updateMemo(value: string) {
    if (isCompleted || isDraftMissing || isMutationBlocked || isSubmitting) return;
    setMemo(value);
    executeMutation(() => service.updateMemo(routineId, value));
  }

  function complete() {
    if (!routine || isCompleted || isDraftMissing || isMutationBlocked || isSubmitting || !checked.some(Boolean)) return;
    executeMutation(() => service.complete(routineId), true);
  }

  return {
    checked,
    complete,
    errorMessage,
    failedMutation,
    isLoading: loadedRoutineId !== routineId || loadedAuthenticationGeneration !== authenticationGeneration || loadStatus === 'loading',
    isMutationBlocked,
    isSaving,
    isSubmitting,
    isUnauthorized,
    loadStatus,
    isCompleted,
    isDraftMissing,
    memo,
    routine,
    retryLoad,
    toggleStep,
    updateMemo,
  };
}
