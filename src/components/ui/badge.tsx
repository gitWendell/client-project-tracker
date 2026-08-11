import type { ProjectPriority, ProjectStatus } from '@/lib/validation/project';

// `whitespace-nowrap` keeps two-word values such as "In Progress" on one line
// when the column is narrow.
const BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium';

/**
 * Colour carries meaning here, so each badge also states its value as text —
 * the label is never conveyed by colour alone.
 */
const STATUS_STYLES: Record<ProjectStatus, string> = {
  Planning: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'On Hold': 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const STATUS_DOTS: Record<ProjectStatus, string> = {
  Planning: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
  'On Hold': 'bg-amber-500',
  Completed: 'bg-emerald-500',
};

const PRIORITY_STYLES: Record<ProjectPriority, string> = {
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  Medium: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  High: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`${BASE} ${STATUS_STYLES[status]}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_DOTS[status]}`} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  return <span className={`${BASE} ${PRIORITY_STYLES[priority]}`}>{priority}</span>;
}
