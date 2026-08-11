/**
 * The due-date logic drives what a project manager sees first, so it is worth
 * pinning down. `today` is injected rather than read from the clock, which is
 * what makes these assertions stable.
 */
import { describe, expect, it } from 'vitest';

import { formatDisplayDate, parseIsoDate } from '@/lib/dates';
import { getDueStatus, summarise } from '@/lib/project-insights';
import type { Project } from '@/lib/types';

const TODAY = '2026-07-01';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    clientName: 'Acme Corporation',
    projectName: 'Corporate Website Redesign',
    description: '',
    status: 'In Progress',
    priority: 'High',
    startDate: '2026-06-01',
    dueDate: '2026-07-15',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getDueStatus', () => {
  it('flags a project whose due date has passed', () => {
    expect(getDueStatus(project({ dueDate: '2026-06-28' }), TODAY)).toEqual({
      tone: 'overdue',
      label: 'Overdue by 3 days',
    });
  });

  it('uses the singular form for a single day', () => {
    expect(getDueStatus(project({ dueDate: '2026-06-30' }), TODAY).label).toBe('Overdue by 1 day');
  });

  it('calls out a project due today', () => {
    expect(getDueStatus(project({ dueDate: TODAY }), TODAY)).toEqual({
      tone: 'soon',
      label: 'Due today',
    });
  });

  it('warns when a project is due within a week', () => {
    expect(getDueStatus(project({ dueDate: '2026-07-05' }), TODAY).tone).toBe('soon');
  });

  it('stays neutral when the deadline is comfortably away', () => {
    expect(getDueStatus(project({ dueDate: '2026-08-01' }), TODAY).tone).toBe('normal');
  });

  it('never marks a completed project as overdue', () => {
    const late = project({ status: 'Completed', dueDate: '2026-01-01' });
    expect(getDueStatus(late, TODAY)).toEqual({ tone: 'complete', label: 'Delivered' });
  });
});

describe('summarise', () => {
  it('counts projects by the states a manager cares about', () => {
    const projects = [
      project({ id: 1, status: 'In Progress', dueDate: '2026-06-01' }), // overdue
      project({ id: 2, status: 'In Progress', dueDate: '2026-09-01' }),
      project({ id: 3, status: 'Completed', dueDate: '2026-05-01' }),
      project({ id: 4, status: 'Planning', dueDate: '2026-12-01' }),
    ];

    expect(summarise(projects, TODAY)).toEqual({
      total: 4,
      inProgress: 2,
      overdue: 1,
      completed: 1,
    });
  });
});

describe('parseIsoDate', () => {
  it('normalises to UTC midnight so dates never shift timezone', () => {
    expect(parseIsoDate('2026-06-01')?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('rejects a date that does not exist in the calendar', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseIsoDate('01-06-2026')).toBeNull();
  });
});

describe('formatDisplayDate', () => {
  it('renders a consistent three-letter month regardless of locale', () => {
    expect(formatDisplayDate('2026-09-01')).toBe('01 Sep 2026');
    expect(formatDisplayDate('2026-07-15')).toBe('15 Jul 2026');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });
});
