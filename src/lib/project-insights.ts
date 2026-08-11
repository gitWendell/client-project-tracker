/**
 * Derived, display-only facts about a project.
 *
 * Kept out of the components (and out of the database) because it is pure
 * logic that depends on today's date: easy to unit test here, impossible to
 * test meaningfully once it is tangled up in JSX.
 */
import { daysBetween, todayIsoDate } from '@/lib/dates';
import type { Project } from '@/lib/types';

export type DueTone = 'complete' | 'overdue' | 'soon' | 'normal';

export interface DueStatus {
  tone: DueTone;
  label: string;
}

/** How a project's due date should read today. */
export function getDueStatus(project: Project, today = todayIsoDate()): DueStatus {
  if (project.status === 'Completed') {
    return { tone: 'complete', label: 'Delivered' };
  }

  const days = daysBetween(today, project.dueDate);

  if (days < 0) {
    const overdueBy = Math.abs(days);
    return { tone: 'overdue', label: `Overdue by ${overdueBy} ${plural(overdueBy, 'day')}` };
  }
  if (days === 0) return { tone: 'soon', label: 'Due today' };
  if (days <= 7) return { tone: 'soon', label: `Due in ${days} ${plural(days, 'day')}` };

  return { tone: 'normal', label: `Due in ${days} days` };
}

export interface ProjectSummary {
  total: number;
  inProgress: number;
  overdue: number;
  completed: number;
}

/** Headline counts for the dashboard strip. */
export function summarise(projects: Project[], today = todayIsoDate()): ProjectSummary {
  return {
    total: projects.length,
    inProgress: projects.filter((project) => project.status === 'In Progress').length,
    overdue: projects.filter((project) => getDueStatus(project, today).tone === 'overdue').length,
    completed: projects.filter((project) => project.status === 'Completed').length,
  };
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
