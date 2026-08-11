'use client';

import { useMemo, useState } from 'react';

import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { ProjectList } from '@/components/projects/project-list';
import {
  DEFAULT_TOOLBAR_STATE,
  ProjectToolbar,
  type ToolbarState,
} from '@/components/projects/project-toolbar';
import { Toaster, useToasts } from '@/components/ui/toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProjects } from '@/hooks/use-projects';
import { projectsApi } from '@/lib/api-client';
import { summarise } from '@/lib/project-insights';
import type { Project } from '@/lib/types';
import type { ProjectFormValues } from '@/lib/validation/project';

/**
 * The one stateful screen in the app: it owns the filters and which dialog is
 * open, and delegates everything else. Data access goes through `useProjects`
 * and `projectsApi`, so this component contains no fetch logic of its own.
 */
export function ProjectsPage() {
  const [toolbar, setToolbar] = useState<ToolbarState>(DEFAULT_TOOLBAR_STATE);
  const [editing, setEditing] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  const { toasts, show, dismiss } = useToasts();

  // Only the search box is debounced; the selects apply immediately.
  const debouncedSearch = useDebouncedValue(toolbar.search, 300);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: toolbar.status || undefined,
      priority: toolbar.priority || undefined,
      sort: toolbar.sort,
      order: toolbar.order,
    }),
    [debouncedSearch, toolbar.status, toolbar.priority, toolbar.sort, toolbar.order],
  );

  const { projects, isLoading, error, refresh } = useProjects(filters);
  const summary = useMemo(() => summarise(projects), [projects]);

  const hasFilters =
    toolbar.search !== '' || toolbar.status !== '' || toolbar.priority !== '';

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setIsFormOpen(true);
  };

  /**
   * Errors are deliberately re-thrown: the dialog owns the error display,
   * because that is where the user is looking and where field-level messages
   * belong. The page only reacts to success.
   */
  const submitProject = async (values: ProjectFormValues) => {
    if (editing) {
      await projectsApi.update(editing.id, values);
    } else {
      await projectsApi.create(values);
    }

    // `editing` is captured from this render, so it still reports which
    // action was taken after the state above has been cleared.
    setIsFormOpen(false);
    setEditing(null);
    refresh();
    show(editing ? 'Project updated.' : 'Project created.');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    await projectsApi.remove(pendingDelete.id);
    setPendingDelete(null);
    refresh();
    show('Project deleted.');
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Client Project Tracker
        </h1>
        <p className="mt-1 text-sm text-muted">
          Track client projects, monitor progress, and manage priorities.
        </p>
      </header>

      <section aria-label="Summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Projects" value={summary.total} />
        <SummaryCard label="In progress" value={summary.inProgress} />
        <SummaryCard label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? 'alert' : 'default'} />
        <SummaryCard label="Completed" value={summary.completed} />
      </section>

      <div className="mb-4">
        <ProjectToolbar
          value={toolbar}
          onChange={(patch) => setToolbar((current) => ({ ...current, ...patch }))}
          onReset={() => setToolbar(DEFAULT_TOOLBAR_STATE)}
          onCreate={openCreate}
        />
      </div>

      <ProjectList
        projects={projects}
        isLoading={isLoading}
        error={error}
        hasFilters={hasFilters}
        onRetry={refresh}
        onResetFilters={() => setToolbar(DEFAULT_TOOLBAR_STATE)}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={setPendingDelete}
      />

      {/*
       * Dialogs are mounted only while they are open, and keyed by the project
       * they act on. Their internal state (form values, submit errors) is
       * therefore created fresh each time one opens.
       */}
      {isFormOpen && (
        <ProjectFormDialog
          key={editing?.id ?? 'new'}
          project={editing}
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={submitProject}
        />
      )}

      {pendingDelete && (
        <DeleteProjectDialog
          key={pendingDelete.id}
          project={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'alert';
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === 'alert' ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
