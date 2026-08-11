'use client';

import { Button } from '@/components/ui/button';
import { controlClassName } from '@/components/ui/form-field';
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type ProjectPriority,
  type ProjectSortField,
  type ProjectStatus,
} from '@/lib/validation/project';

export interface ToolbarState {
  search: string;
  status: '' | ProjectStatus;
  priority: '' | ProjectPriority;
  sort: ProjectSortField;
  order: 'asc' | 'desc';
}

export const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  search: '',
  status: '',
  priority: '',
  sort: 'dueDate',
  order: 'asc',
};

const SORT_LABELS: Record<ProjectSortField, string> = {
  dueDate: 'Due date',
  startDate: 'Start date',
  priority: 'Priority',
  projectName: 'Project name',
  clientName: 'Client name',
  createdAt: 'Recently added',
};

interface ProjectToolbarProps {
  value: ToolbarState;
  onChange: (patch: Partial<ToolbarState>) => void;
  onReset: () => void;
  onCreate: () => void;
}

export function ProjectToolbar({ value, onChange, onReset, onCreate }: ProjectToolbarProps) {
  const hasFilters =
    value.search !== '' || value.status !== '' || value.priority !== '';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-56 flex-1 flex-col gap-1.5">
        <label htmlFor="search" className="text-xs font-medium text-muted">
          Search
        </label>
        <input
          id="search"
          type="search"
          value={value.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Client, project or description"
          className={controlClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status-filter" className="text-xs font-medium text-muted">
          Status
        </label>
        <select
          id="status-filter"
          value={value.status}
          onChange={(event) => onChange({ status: event.target.value as ToolbarState['status'] })}
          className={controlClassName}
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="priority-filter" className="text-xs font-medium text-muted">
          Priority
        </label>
        <select
          id="priority-filter"
          value={value.priority}
          onChange={(event) =>
            onChange({ priority: event.target.value as ToolbarState['priority'] })
          }
          className={controlClassName}
        >
          <option value="">All priorities</option>
          {PROJECT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="text-xs font-medium text-muted">
          Sort by
        </label>
        <div className="flex gap-2">
          <select
            id="sort"
            value={value.sort}
            onChange={(event) => onChange({ sort: event.target.value as ProjectSortField })}
            className={controlClassName}
          >
            {Object.entries(SORT_LABELS).map(([field, label]) => (
              <option key={field} value={field}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => onChange({ order: value.order === 'asc' ? 'desc' : 'asc' })}
            aria-label={`Sort ${value.order === 'asc' ? 'descending' : 'ascending'}`}
            title={value.order === 'asc' ? 'Ascending' : 'Descending'}
            className="px-3"
          >
            <span aria-hidden="true">{value.order === 'asc' ? '↑' : '↓'}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 justify-end gap-2 sm:flex-none">
        {hasFilters && (
          <Button variant="ghost" onClick={onReset}>
            Clear
          </Button>
        )}
        <Button onClick={onCreate}>New project</Button>
      </div>
    </div>
  );
}
