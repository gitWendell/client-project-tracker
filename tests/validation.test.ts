/**
 * Covers every validation rule the requirements call out, plus the edge cases
 * around them. These run against the same schema the API and the form use.
 */
import { describe, expect, it } from 'vitest';

import { toFieldErrors } from '@/lib/http/errors';
import { projectInputSchema, projectQuerySchema } from '@/lib/validation/project';

import { buildProjectInput } from './support/in-memory-project-repository';

/** Parses and returns the field errors, failing the test if parsing succeeded. */
function errorsFor(input: unknown): Record<string, string[]> {
  const result = projectInputSchema.safeParse(input);
  if (result.success) throw new Error('Expected validation to fail, but it passed.');
  return toFieldErrors(result.error);
}

describe('projectInputSchema', () => {
  it('accepts a well-formed project', () => {
    const result = projectInputSchema.safeParse(buildProjectInput());
    expect(result.success).toBe(true);
  });

  it('requires a client name', () => {
    expect(errorsFor(buildProjectInput({ clientName: '' })).clientName).toContain(
      'Client name is required',
    );
  });

  it('treats a whitespace-only client name as missing', () => {
    expect(errorsFor(buildProjectInput({ clientName: '   ' })).clientName).toContain(
      'Client name is required',
    );
  });

  it('requires a project name', () => {
    expect(errorsFor(buildProjectInput({ projectName: '' })).projectName).toContain(
      'Project name is required',
    );
  });

  it('rejects a status outside the allowed values', () => {
    const errors = errorsFor({ ...buildProjectInput(), status: 'Almost Done' });
    expect(errors.status?.[0]).toBe(
      'Status must be one of: Planning, In Progress, On Hold, Completed',
    );
  });

  it('rejects a priority outside the allowed values', () => {
    const errors = errorsFor({ ...buildProjectInput(), priority: 'Urgent' });
    expect(errors.priority?.[0]).toBe('Priority must be one of: Low, Medium, High');
  });

  it('rejects a due date earlier than the start date', () => {
    const errors = errorsFor(
      buildProjectInput({ startDate: '2026-07-15', dueDate: '2026-06-01' }),
    );
    expect(errors.dueDate).toContain('Due date cannot be earlier than the start date');
  });

  it('allows a due date equal to the start date', () => {
    const result = projectInputSchema.safeParse(
      buildProjectInput({ startDate: '2026-06-01', dueDate: '2026-06-01' }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects dates that are not real calendar dates', () => {
    // 2026 is not a leap year, so 29 February does not exist.
    expect(errorsFor(buildProjectInput({ startDate: '2026-02-29' })).startDate).toContain(
      'Start date is not a real calendar date',
    );
  });

  it('rejects dates in the wrong format', () => {
    expect(errorsFor(buildProjectInput({ dueDate: '15/07/2026' })).dueDate).toContain(
      'Due date must use the format YYYY-MM-DD',
    );
  });

  it('reports every invalid field at once rather than stopping at the first', () => {
    const errors = errorsFor({ clientName: '', projectName: '', status: 'Nope', priority: 'Nope' });
    expect(Object.keys(errors).sort()).toEqual([
      'clientName',
      'dueDate',
      'priority',
      'projectName',
      'startDate',
      'status',
    ]);
  });

  it('defaults a missing description to an empty string', () => {
    const input = buildProjectInput();
    delete (input as Partial<typeof input>).description;

    const result = projectInputSchema.parse(input);
    expect(result.description).toBe('');
  });

  it('trims surrounding whitespace from text fields', () => {
    const result = projectInputSchema.parse(buildProjectInput({ clientName: '  Acme  ' }));
    expect(result.clientName).toBe('Acme');
  });

  it('strips unknown fields so ids cannot be set by the client', () => {
    const result = projectInputSchema.parse({ ...buildProjectInput(), id: 999 });
    expect(result).not.toHaveProperty('id');
  });
});

describe('projectQuerySchema', () => {
  it('applies sensible defaults when nothing is supplied', () => {
    expect(projectQuerySchema.parse({})).toMatchObject({ sort: 'dueDate', order: 'asc' });
  });

  it('treats empty filter values as "no filter"', () => {
    const query = projectQuerySchema.parse({ search: '', status: '', priority: '' });
    expect(query.search).toBeUndefined();
    expect(query.status).toBeUndefined();
    expect(query.priority).toBeUndefined();
  });

  it('rejects an unknown sort field', () => {
    expect(projectQuerySchema.safeParse({ sort: 'clientEmail' }).success).toBe(false);
  });
});
