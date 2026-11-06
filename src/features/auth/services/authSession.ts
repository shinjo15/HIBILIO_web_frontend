import { apiFetch } from '../../../shared/api/apiFetch';

export type AuthenticationStatus = 'authenticated' | 'loading' | 'unauthenticated';

let authenticationStatus: AuthenticationStatus = 'loading';
let restoration: Promise<void> | null = null;
let sessionGeneration = 0;
const listeners = new Set<() => void>();

export class CsrfTokenError extends Error {
  constructor(public readonly status: number) {
    super('Failed to fetch CSRF token');
    this.name = 'CsrfTokenError';
  }
}

function setAuthenticationStatus(status: AuthenticationStatus): void {
  authenticationStatus = status;
  listeners.forEach((listener) => listener());
}

function setAuthenticationStatusIfCurrent(status: AuthenticationStatus, generation: number): boolean {
  if (generation !== sessionGeneration) return false;
  setAuthenticationStatus(status);
  return true;
}

function transitionAuthenticationStatus(status: AuthenticationStatus): void {
  sessionGeneration += 1;
  setAuthenticationStatus(status);
}

export async function getCsrfToken(): Promise<string> {
  const response = await apiFetch('/api/csrf-token', { credentials: 'include', method: 'GET' });
  if (!response.ok) throw new CsrfTokenError(response.status);

  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('csrf_token' in body) || typeof body.csrf_token !== 'string' || body.csrf_token === '') {
    throw new Error('Invalid CSRF token response');
  }

  return body.csrf_token;
}

async function verifySession(): Promise<Response> {
  return apiFetch('/api/my/account', { credentials: 'include', method: 'GET' });
}

export function getAuthenticationStatus(): AuthenticationStatus {
  return authenticationStatus;
}

export function subscribeToAuthentication(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAuthenticated(): boolean {
  return authenticationStatus === 'authenticated';
}

export function markAuthenticated(): void {
  transitionAuthenticationStatus('authenticated');
}

export function clearAuthenticated(): void {
  transitionAuthenticationStatus('unauthenticated');
}

export async function restoreAuthentication(): Promise<void> {
  if (restoration !== null) return restoration;

  const generation = sessionGeneration;
  setAuthenticationStatus('loading');
  restoration = (async () => {
    try {
      const sessionResponse = await verifySession();
      if (generation !== sessionGeneration) return;
      if (sessionResponse.ok) {
        setAuthenticationStatusIfCurrent('authenticated', generation);
        return;
      }

      if (sessionResponse.status !== 401) {
        setAuthenticationStatusIfCurrent('unauthenticated', generation);
        return;
      }

      const csrfToken = await getCsrfToken();
      if (generation !== sessionGeneration) return;
      const restoreResponse = await apiFetch('/api/persistent-login/restore', {
        credentials: 'include',
        headers: { 'X-CSRF-TOKEN': csrfToken },
        method: 'POST',
      });

      if (!restoreResponse.ok) {
        setAuthenticationStatusIfCurrent('unauthenticated', generation);
        return;
      }

      if (generation !== sessionGeneration) return;
      const verifiedResponse = await verifySession();
      setAuthenticationStatusIfCurrent(verifiedResponse.ok ? 'authenticated' : 'unauthenticated', generation);
    } catch {
      setAuthenticationStatusIfCurrent('unauthenticated', generation);
    } finally {
      restoration = null;
    }
  })();

  return restoration;
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  const response = await apiFetch('/api/logout', {
    credentials: 'include',
    headers: { 'X-CSRF-TOKEN': csrfToken },
    method: 'POST',
  });

  if (!response.ok) throw new Error('Failed to logout');
  clearAuthenticated();
}

export function resetAuthenticationForTesting(): void {
  restoration = null;
  sessionGeneration = 0;
  authenticationStatus = 'loading';
}