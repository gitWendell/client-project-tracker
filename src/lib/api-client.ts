/**
 * Browser-side client for the projects API.
 *
 * The UI never calls `fetch` directly. Everything goes through here so that
 * the response envelope is unwrapped in one place and every failure — HTTP
 * error, validation error, or the network being down — arrives as the same
 * `ApiError` type the components know how to render.
 */
import type { FieldErrors } from '@/lib/http/errors';
import type { ApiFailure, ApiSuccess, Project } from '@/lib/types';
import type { ProjectInput, ProjectQuery } from '@/lib/validation/project';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, code: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (error) {
    // An aborted request is a deliberate cancellation, not a failure to report.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Could not reach the server. Check that it is running and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  // 204 No Content (DELETE) has no body to parse.
  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const failure = (payload as ApiFailure | null)?.error;
    throw new ApiError(
      failure?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      failure?.code ?? 'UNKNOWN_ERROR',
      failure?.fieldErrors,
    );
  }

  return (payload as ApiSuccess<T>).data;
}

/** Drops empty values so the URL only carries filters that are actually set. */
function toSearchParams(query: Partial<ProjectQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Only the operations the UI actually performs are defined here. The API also
 * serves `GET /api/projects/:id`, but the list response already carries every
 * field the screen needs, so adding a client method for it would be dead code.
 */
export const projectsApi = {
  list: (query: Partial<ProjectQuery> = {}, signal?: AbortSignal) =>
    request<Project[]>(`/api/projects${toSearchParams(query)}`, { signal }),

  create: (input: ProjectInput) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),

  update: (id: number, input: ProjectInput) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  remove: (id: number) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
};
