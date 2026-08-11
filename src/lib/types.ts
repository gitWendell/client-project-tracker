import type { ProjectPriority, ProjectStatus } from '@/lib/validation/project';

/**
 * The shape of a project as it crosses the API boundary.
 *
 * Deliberately not the Prisma model: dates are ISO strings rather than `Date`
 * objects (JSON has no date type), and internal columns such as `priorityRank`
 * are not exposed. Repositories are responsible for the translation.
 */
export interface Project {
  id: number;
  clientName: string;
  projectName: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  /** `YYYY-MM-DD` */
  startDate: string;
  /** `YYYY-MM-DD` */
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Successful responses are always `{ data: ... }`. */
export interface ApiSuccess<T> {
  data: T;
}

/** Failed responses are always `{ error: ... }`. */
export interface ApiFailure {
  error: {
    code: string;
    message: string;
    /** Present on validation failures, keyed by form field name. */
    fieldErrors?: Record<string, string[]>;
  };
}
