'use client';

import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dates';
import { getDueStatus, type DueTone } from '@/lib/project-insights';
import type { Project } from '@/lib/types';

const DUE_TONE_STYLES: Record<DueTone, string> = {
  overdue: 'text-red-600 dark:text-red-400 font-medium',
  soon: 'text-amber-600 dark:text-amber-400',
  normal: 'text-muted',
  complete: 'text-emerald-600 dark:text-emerald-400',
};

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  hasFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * Chooses between the loading, error, empty and populated states, then renders
 * the same data two ways: a table from `md` upwards, cards below it. A table
 * is the clearest way to compare projects on a wide screen, and the worst on
 * a narrow one.
 */
export function ProjectList({
  projects,
  isLoading,
  error,
  hasFilters,
  onRetry,
  onResetFilters,
  onCreate,
  onEdit,
  onDelete,
}: ProjectListProps) {
  if (error) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </Panel>
    );
  }

  if (isLoading && projects.length === 0) {
    return (
      <Panel>
        <div className="divide-y divide-border-subtle" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="h-4 flex-1 animate-pulse rounded bg-surface-muted" />
              <div className="hidden h-4 w-24 animate-pulse rounded bg-surface-muted sm:block" />
              <div className="hidden h-4 w-20 animate-pulse rounded bg-surface-muted sm:block" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (projects.length === 0) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-foreground">
            {hasFilters ? 'No projects match your filters' : 'No projects yet'}
          </h2>
          <p className="max-w-sm text-sm text-muted">
            {hasFilters
              ? 'Try a different search term, or clear the filters to see everything.'
              : 'Add your first client project to start tracking progress and deadlines.'}
          </p>
          <div className="mt-2">
            {hasFilters ? (
              <Button variant="secondary" onClick={onResetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={onCreate}>New project</Button>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    // Dimmed while a background refresh is in flight, so the list never
    // flashes empty between filter changes.
    <div className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <Panel className="hidden md:block">
        <ProjectTable projects={projects} onEdit={onEdit} onDelete={onDelete} />
      </Panel>
      <div className="flex flex-col gap-3 md:hidden">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border-subtle bg-surface ${className}`}>
      {children}
    </div>
  );
}

type RowActions = Pick<ProjectListProps, 'onEdit' | 'onDelete'>;

function ProjectTable({ projects, onEdit, onDelete }: { projects: Project[] } & RowActions) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-border-subtle bg-surface-muted text-xs uppercase tracking-wide text-muted">
        <tr>
          <th scope="col" className="px-5 py-3 font-medium">
            Project
          </th>
          <th scope="col" className="px-5 py-3 font-medium">
            Client
          </th>
          <th scope="col" className="px-5 py-3 font-medium">
            Status
          </th>
          <th scope="col" className="px-5 py-3 font-medium">
            Priority
          </th>
          <th scope="col" className="px-5 py-3 font-medium">
            Timeline
          </th>
          <th scope="col" className="px-5 py-3 text-right font-medium">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-subtle">
        {projects.map((project) => {
          const due = getDueStatus(project);
          return (
            <tr key={project.id} className="align-top hover:bg-surface-muted/60">
              <td className="px-5 py-4">
                <p className="font-medium text-foreground">{project.projectName}</p>
                {project.description && (
                  <p className="mt-0.5 max-w-md text-xs text-muted line-clamp-2">
                    {project.description}
                  </p>
                )}
              </td>
              <td className="px-5 py-4 text-foreground">{project.clientName}</td>
              <td className="px-5 py-4">
                <StatusBadge status={project.status} />
              </td>
              <td className="px-5 py-4">
                <PriorityBadge priority={project.priority} />
              </td>
              <td className="px-5 py-4">
                <p className="whitespace-nowrap text-foreground">
                  {formatDisplayDate(project.startDate)} – {formatDisplayDate(project.dueDate)}
                </p>
                <p className={`mt-0.5 text-xs ${DUE_TONE_STYLES[due.tone]}`}>{due.label}</p>
              </td>
              <td className="px-5 py-4">
                <RowButtons project={project} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ProjectCard({ project, onEdit, onDelete }: { project: Project } & RowActions) {
  const due = getDueStatus(project);

  return (
    <article className="rounded-xl border border-border-subtle bg-surface p-4">
      <p className="text-xs text-muted">{project.clientName}</p>
      <h3 className="mt-0.5 font-medium text-foreground">{project.projectName}</h3>
      {project.description && <p className="mt-1 text-sm text-muted">{project.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted">Start</dt>
          <dd className="text-foreground">{formatDisplayDate(project.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Due</dt>
          <dd className="text-foreground">{formatDisplayDate(project.dueDate)}</dd>
        </div>
      </dl>

      <p className={`mt-2 text-xs ${DUE_TONE_STYLES[due.tone]}`}>{due.label}</p>

      <div className="mt-4 flex justify-end">
        <RowButtons project={project} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </article>
  );
}

function RowButtons({ project, onEdit, onDelete }: { project: Project } & RowActions) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        onClick={() => onEdit(project)}
        aria-label={`Edit ${project.projectName}`}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        onClick={() => onDelete(project)}
        aria-label={`Delete ${project.projectName}`}
        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        Delete
      </Button>
    </div>
  );
}
