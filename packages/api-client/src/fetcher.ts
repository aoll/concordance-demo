/**
 * Fetch utilisé par tous les hooks générés : cookie de session inclus, et toute réponse non 2xx
 * levée en ApiError pour que TanStack Query passe en erreur (rollback optimiste, toasts…).
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

/** Orval type l'erreur des hooks avec ce générique (ex. ErrorType<ErrorResponse>). */
export type ErrorType<TBody> = ApiError<TBody>;

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'include' });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}
