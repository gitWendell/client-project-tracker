'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField, controlClassName, invalidControlClassName } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { ApiError } from '@/lib/api-client';
import { parseIsoDate, toIsoDate, todayIsoDate } from '@/lib/dates';
import type { Project } from '@/lib/types';
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  projectFormSchema,
  type ProjectFormValues,
} from '@/lib/validation/project';

interface ProjectFormDialogProps {
  /** `null` creates a new project; a project edits that one. */
  project: Project | null;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function defaultValues(project: Project | null): ProjectFormValues {
  if (project) {
    const { clientName, projectName, description, status, priority, startDate, dueDate } = project;
    return { clientName, projectName, description, status, priority, startDate, dueDate };
  }

  const today = todayIsoDate();
  return {
    clientName: '',
    projectName: '',
    description: '',
    status: 'Planning',
    priority: 'Medium',
    startDate: today,
    // A fortnight is a more useful starting point than an empty box, and the
    // user can still change it.
    dueDate: addDays(today, 14),
  };
}

/**
 * The dialog is mounted only while it is open, and the parent gives it a `key`
 * per project. Opening it therefore always starts from fresh state — no effect
 * is needed to reset the fields between a create and an edit.
 */
export function ProjectFormDialog({ project, onClose, onSubmit }: ProjectFormDialogProps) {
  const isEditing = project !== null;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultValues(project),
    // Validate on blur, then live once a field has been marked invalid, so the
    // form is helpful without complaining while the user is still typing.
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        // The server is the authority. Its per-field messages are attached to
        // the matching inputs; anything that maps to no field (such as the
        // cross-field `_form` bucket) is shown as a banner instead.
        let unmatched: string | null = null;

        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (!messages?.length) continue;
          if (field in values) {
            setError(field as keyof ProjectFormValues, { type: 'server', message: messages[0] });
          } else {
            unmatched = messages[0];
          }
        }

        setFormError(unmatched);
        return;
      }

      setFormError(
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <Modal
      onClose={onClose}
      title={isEditing ? 'Edit project' : 'New project'}
      description={
        isEditing
          ? `Update the details for ${project.projectName}.`
          : 'Add a client project to the tracker.'
      }
    >
      <form onSubmit={submit} noValidate>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client name" htmlFor="clientName" required error={errors.clientName?.message}>
              <input
                id="clientName"
                autoComplete="off"
                aria-invalid={Boolean(errors.clientName)}
                aria-describedby={errors.clientName ? 'clientName-error' : undefined}
                className={`${controlClassName} ${errors.clientName ? invalidControlClassName : ''}`}
                {...register('clientName')}
              />
            </FormField>

            <FormField label="Project name" htmlFor="projectName" required error={errors.projectName?.message}>
              <input
                id="projectName"
                autoComplete="off"
                aria-invalid={Boolean(errors.projectName)}
                aria-describedby={errors.projectName ? 'projectName-error' : undefined}
                className={`${controlClassName} ${errors.projectName ? invalidControlClassName : ''}`}
                {...register('projectName')}
              />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <textarea
              id="description"
              rows={3}
              aria-invalid={Boolean(errors.description)}
              className={`${controlClassName} resize-y ${errors.description ? invalidControlClassName : ''}`}
              {...register('description')}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor="status" required error={errors.status?.message}>
              <select id="status" className={controlClassName} {...register('status')}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Priority" htmlFor="priority" required error={errors.priority?.message}>
              <select id="priority" className={controlClassName} {...register('priority')}>
                {PROJECT_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Start date" htmlFor="startDate" required error={errors.startDate?.message}>
              <input
                id="startDate"
                type="date"
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                className={`${controlClassName} ${errors.startDate ? invalidControlClassName : ''}`}
                {...register('startDate')}
              />
            </FormField>

            <FormField
              label="Due date"
              htmlFor="dueDate"
              required
              error={errors.dueDate?.message}
              hint="Must be on or after the start date."
            >
              <input
                id="dueDate"
                type="date"
                aria-invalid={Boolean(errors.dueDate)}
                aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
                className={`${controlClassName} ${errors.dueDate ? invalidControlClassName : ''}`}
                {...register('dueDate')}
              />
            </FormField>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border-subtle px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
