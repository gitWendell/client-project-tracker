'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ApiError } from '@/lib/api-client';
import type { Project } from '@/lib/types';

interface DeleteProjectDialogProps {
  project: Project;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Deletion is irreversible, so it always asks first and names the project. */
export function DeleteProjectDialog({ project, onClose, onConfirm }: DeleteProjectDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not delete the project. Please try again.',
      );
      setIsDeleting(false);
    }
    // On success the dialog is unmounted by its parent, so there is no state
    // left to reset here.
  };

  return (
    <Modal onClose={onClose} title="Delete project" description="This cannot be undone.">
      <div className="space-y-4 px-6 py-5">
        <p className="text-sm text-foreground">
          Delete <strong className="font-semibold">{project.projectName}</strong> for{' '}
          <strong className="font-semibold">{project.clientName}</strong>?
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>
      <footer className="flex justify-end gap-2 border-t border-border-subtle px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} isLoading={isDeleting}>
          Delete project
        </Button>
      </footer>
    </Modal>
  );
}
