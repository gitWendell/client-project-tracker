/**
 * The single source of truth for what a valid project is.
 *
 * These schemas are imported by the API (server-side enforcement) *and* by the
 * create/edit form (client-side feedback). One definition means the two can
 * never drift apart, which is the main reason the app is TypeScript on both
 * ends. Everything here is framework-agnostic and dependency-free apart from
 * Zod, so it is trivial to unit test — see tests/validation.test.ts.
 */
import { z } from 'zod';

import { ISO_DATE_PATTERN, parseIsoDate } from '@/lib/dates';

export const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed'] as const;
export const PROJECT_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

/** Severity order used for sorting; see `priorityRank` in the Prisma schema. */
const PRIORITY_RANK: Record<ProjectPriority, number> = { Low: 1, Medium: 2, High: 3 };

export function priorityRankOf(priority: ProjectPriority): number {
  return PRIORITY_RANK[priority];
}

/** Builds an enum schema whose error message lists the accepted values. */
function enumField<T extends readonly [string, ...string[]]>(values: T, label: string) {
  return z.enum(values, {
    errorMap: () => ({ message: `${label} must be one of: ${values.join(', ')}` }),
  });
}

const isoDateField = (label: string) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .regex(ISO_DATE_PATTERN, `${label} must use the format YYYY-MM-DD`)
    .refine((value) => parseIsoDate(value) !== null, `${label} is not a real calendar date`);

const requiredText = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Every field of a project, defined exactly once. */
const projectFields = {
  clientName: requiredText('Client name', 120),
  projectName: requiredText('Project name', 160),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer'),
  status: enumField(PROJECT_STATUSES, 'Status'),
  priority: enumField(PROJECT_PRIORITIES, 'Priority'),
  startDate: isoDateField('Start date'),
  dueDate: isoDateField('Due date'),
};

/** The cross-field rule from the requirements, shared by both schemas below. */
const dueDateNotBeforeStart = (value: { startDate: string; dueDate: string }) => {
  const start = parseIsoDate(value.startDate);
  const due = parseIsoDate(value.dueDate);
  // Field-level errors already cover unparseable dates; don't double-report.
  if (!start || !due) return true;
  return due.getTime() >= start.getTime();
};

const dueDateRuleOptions: { message: string; path: string[] } = {
  message: 'Due date cannot be earlier than the start date',
  path: ['dueDate'],
};

/**
 * The write contract for the API — used by both POST and PUT.
 *
 * `description` is optional here because an API client may legitimately omit
 * it. Unknown keys (such as a client-supplied `id`) are stripped rather than
 * trusted, which keeps ids server-assigned.
 */
export const projectInputSchema = z
  .object({
    ...projectFields,
    description: projectFields.description.optional().default(''),
  })
  .refine(dueDateNotBeforeStart, dueDateRuleOptions);

export type ProjectInput = z.infer<typeof projectInputSchema>;

/**
 * The same contract as seen by the create/edit form.
 *
 * Identical rules; `description` is simply always present, because a textarea
 * always yields a string. Deriving it from `projectFields` guarantees the form
 * can never validate differently from the server.
 */
export const projectFormSchema = z.object(projectFields).refine(dueDateNotBeforeStart, dueDateRuleOptions);

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/** Route params: ids arrive as strings and must be positive integers. */
export const projectIdSchema = z.coerce
  .number({ invalid_type_error: 'Project id must be a number' })
  .int('Project id must be a whole number')
  .positive('Project id must be a positive number');

export const PROJECT_SORT_FIELDS = [
  'dueDate',
  'startDate',
  'priority',
  'projectName',
  'clientName',
  'createdAt',
] as const;

export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

/**
 * Query contract for `GET /projects`. Every field is optional, and an empty
 * string is treated as "not supplied" so the UI can send its inputs verbatim.
 */
export const projectQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: z
    .union([enumField(PROJECT_STATUSES, 'Status'), z.literal('')])
    .optional()
    .transform((value) => (value ? (value as ProjectStatus) : undefined)),
  priority: z
    .union([enumField(PROJECT_PRIORITIES, 'Priority'), z.literal('')])
    .optional()
    .transform((value) => (value ? (value as ProjectPriority) : undefined)),
  sort: z.enum(PROJECT_SORT_FIELDS).optional().default('dueDate'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type ProjectQuery = z.infer<typeof projectQuerySchema>;
