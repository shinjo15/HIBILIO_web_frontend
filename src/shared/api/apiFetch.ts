export function apiUrl(path: string): string {
  if (!/^\/(?:api|auth\/social)(?:\/|\?|$)/.test(path)) return path;
  const origin = import.meta.env.VITE_API_ORIGIN;
  if (!origin) return path;

  // Reject paths and URL-parser repairs instead of silently using the wrong API host.
  try {
    if (!/^https?:\/\/[^/?#\\\s@]+\/?$/.test(origin)) throw new Error();
    return `${new URL(origin).origin}${path}`;
  } catch {
    throw new Error('Invalid VITE_API_ORIGIN: expected an HTTP(S) origin without credentials, path, query or fragment');
  }
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { credentials: 'include', ...init });
}
