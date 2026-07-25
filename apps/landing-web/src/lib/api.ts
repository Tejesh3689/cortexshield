/**
 * lib/api.ts — Central fetch wrapper for CortexShield landing-web.
 *
 * Reads api_key, tenant_id, and agent_id from localStorage and injects
 * them as headers on every request. All /api/* calls are proxied to
 * portal-web (Next.js) via the Vite dev proxy.
 *
 * Error handling:
 *   401 → emits "cs:unauthorized" event (App.tsx listens and signs out)
 *   403 → throws with message "Forbidden"
 *   429 → throws with message "Rate limited"
 *   5xx → throws with message from body or generic
 */

export const STORAGE_KEYS = {
  API_KEY: 'cs-api-key',
  TENANT_ID: 'cs-tenant-id',
  AGENT_ID: 'cs-agent-id',
  AUTH: 'cs-authenticated',
  EMAIL: 'cs-user-email',
} as const;

// proxy-engine is at :8000, but for browser calls we go through /api proxy → portal-web
export const PROXY_ENGINE_URL = import.meta.env.VITE_PROXY_ENGINE_URL || 'http://localhost:8000';
export const REALTIME_GW_URL = import.meta.env.VITE_REALTIME_GW_URL || 'ws://localhost:8200';

function getAuthHeaders(): Record<string, string> {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) ?? '';
  const tenantId = localStorage.getItem(STORAGE_KEYS.TENANT_ID) ?? 'default';
  const agentId = localStorage.getItem(STORAGE_KEYS.AGENT_ID) ?? 'portal-user';
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    ...(agentId ? { 'x-agent-id': agentId } : {}),
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('cs:unauthorized'));
    throw new ApiError(401, 'Unauthorized — please sign in again');
  }
  if (res.status === 403) {
    throw new ApiError(403, 'Forbidden');
  }
  if (res.status === 429) {
    throw new ApiError(429, 'Rate limited — please wait a moment');
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.error ?? body?.detail ?? body?.message ?? msg;
    } catch { /* ignore parse error */ }
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

/**
 * Validate an API key against the proxy-engine health endpoint.
 * Returns the api_key string on success, throws on failure.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_ENGINE_URL}/health`, {
      headers: { 'x-api-key': apiKey },
    });
    return res.ok;
  } catch {
    // proxy-engine may not be reachable in all environments —
    // accept any non-empty key and let the first real API call catch 401
    return apiKey.length > 10;
  }
}
