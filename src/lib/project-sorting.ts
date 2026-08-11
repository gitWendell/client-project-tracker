/**
 * Sort presentation shared by the toolbar dropdown and the table headers.
 *
 * Both controls drive the same piece of state, so their labels and their idea
 * of a sensible starting direction live here rather than being written twice.
 */
import type { ProjectSortField } from '@/lib/validation/project';

export const SORT_LABELS: Record<ProjectSortField, string> = {
  dueDate: 'Due date',
  startDate: 'Start date',
  priority: 'Priority',
  status: 'Status',
  projectName: 'Project name',
  clientName: 'Client name',
  createdAt: 'Recently added',
};

/**
 * The direction a column should start in when it is first clicked.
 *
 * Ascending is wrong for most of these: clicking "Priority" should show the
 * High-priority work first, and "Recently added" should show the newest.
 * Dates and names read naturally in ascending order.
 */
export const DEFAULT_SORT_ORDER: Record<ProjectSortField, 'asc' | 'desc'> = {
  dueDate: 'asc',
  startDate: 'asc',
  priority: 'desc',
  status: 'asc',
  projectName: 'asc',
  clientName: 'asc',
  createdAt: 'desc',
};

/**
 * Applies a click on a sort control: clicking the active field flips the
 * direction, clicking a new one switches to it in its natural direction.
 */
export function nextSortState(
  current: { sort: ProjectSortField; order: 'asc' | 'desc' },
  field: ProjectSortField,
): { sort: ProjectSortField; order: 'asc' | 'desc' } {
  if (current.sort === field) {
    return { sort: field, order: current.order === 'asc' ? 'desc' : 'asc' };
  }
  return { sort: field, order: DEFAULT_SORT_ORDER[field] };
}
