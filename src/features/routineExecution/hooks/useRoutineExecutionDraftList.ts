import { useEffect, useSyncExternalStore } from 'react';
import { clearAuthenticated, getAuthenticationGeneration, getAuthenticationStatus, subscribeToAuthentication } from '../../auth/services/authSession';
import {
  getRoutineExecutionDraftListSnapshot,
  refreshRoutineExecutionDraftList,
  routineExecutionDraftsChangedEvent,
  subscribeToRoutineExecutionDraftList,
  type RoutineExecutionDraftListState,
} from '../services/routineExecutionDraftList';

const loadingState: RoutineExecutionDraftListState = { generation: -1, items: [], status: 'loading' };

export function useRoutineExecutionDraftList(isEnabled = true): RoutineExecutionDraftListState {
  const authenticationStatus = useSyncExternalStore(subscribeToAuthentication, getAuthenticationStatus, getAuthenticationStatus);
  const authenticationGeneration = useSyncExternalStore(subscribeToAuthentication, getAuthenticationGeneration, getAuthenticationGeneration);
  const state = useSyncExternalStore(subscribeToRoutineExecutionDraftList, getRoutineExecutionDraftListSnapshot, getRoutineExecutionDraftListSnapshot);
  const enabled = isEnabled && authenticationStatus === 'authenticated';

  useEffect(() => {
    if (!enabled) return;
    void refreshRoutineExecutionDraftList();
    const refresh = () => { void refreshRoutineExecutionDraftList(); };
    window.addEventListener(routineExecutionDraftsChangedEvent, refresh);
    return () => window.removeEventListener(routineExecutionDraftsChangedEvent, refresh);
  }, [authenticationGeneration, enabled]);

  useEffect(() => {
    if (enabled && state.status === 'unauthorized' && state.generation === authenticationGeneration && getAuthenticationGeneration() === authenticationGeneration) clearAuthenticated();
  }, [authenticationGeneration, enabled, state]);

  return enabled && state.generation === authenticationGeneration ? state : loadingState;
}
