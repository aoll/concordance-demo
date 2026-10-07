/**
 * Fetch used by all generated hooks: session cookie included, and any non-2xx response
 * thrown as ApiError so that TanStack Query goes into error state (optimistic rollback, toasts…).
 */
export class ApiError<TBody = unknown> extends Error {
  constructor(
    readonly status: number,
    readonly body: TBody,
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
  }
}

/** Orval types the hooks' error with this generic (e.g. ErrorType<ErrorResponse>). */
export type ErrorType<TBody> = ApiError<TBody>;

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'include' });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}
