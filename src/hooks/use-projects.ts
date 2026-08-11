'use client';

import { useCallback, useEffect, useState } from 'react';

import { ApiError, projectsApi } from '@/lib/api-client';
import type { Project } from '@/lib/types';
import type { ProjectQuery } from '@/lib/validation/project';

export type ProjectFilters = Partial<ProjectQuery>;

interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  /** Non-null when the last load failed; the UI offers a retry. */
  error: string | null;
  refresh: () => void;
}

interface LoadedState {
  /** The request this result belongs to; see `isLoading` below. */
  key: string;
  projects: Project[];
  error: string | null;
}

const INITIAL: LoadedState = { key: '', projects: [], error: null };

/**
 * Loads the project list for the given filters.
 *
 * Filtering and sorting are done by the API rather than in the browser: the
 * database is the right place for that work, and it keeps the behaviour
 * identical for any other client of the same endpoint.
 *
 * Loading is *derived* — the result carries the key of the request that
 * produced it, so anything other than the current key means a request is in
 * flight. That avoids a `setState` on every render pass and makes stale
 * responses impossible to mistake for fresh ones.
 */
export function useProjects(filters: ProjectFilters): UseProjectsResult {
  const [result, setResult] = useState<LoadedState>(INITIAL);
  const [reloadToken, setReloadToken] = useState(0);

  // Filters are compared by value, so a new object with identical contents
  // does not trigger another request.
  const filterKey = JSON.stringify(filters);
  const requestKey = `${reloadToken}:${filterKey}`;

  useEffect(() => {
    const controller = new AbortController();

    projectsApi
      .list(JSON.parse(filterKey) as ProjectFilters, controller.signal)
      .then((projects) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, projects, error: null });
      })
      .catch((error: unknown) => {
        // An abort means a newer request has already taken over.
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          projects: [],
          error: error instanceof ApiError ? error.message : 'Unable to load projects.',
        });
      });

    return () => controller.abort();
  }, [requestKey, filterKey]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    projects: result.projects,
    error: result.error,
    isLoading: result.key !== requestKey,
    refresh,
  };
}
