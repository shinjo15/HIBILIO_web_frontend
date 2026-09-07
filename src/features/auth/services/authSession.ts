const authenticatedSessionKey = 'hibilio.authenticated';

export function isAuthenticated(): boolean {
  return window.sessionStorage.getItem(authenticatedSessionKey) === 'true';
}

export function markAuthenticated(): void {
  window.sessionStorage.setItem(authenticatedSessionKey, 'true');
}

export function clearAuthenticated(): void {
  window.sessionStorage.removeItem(authenticatedSessionKey);
}