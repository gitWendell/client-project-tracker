/**
 * Exercises the service against an in-memory repository: real business rules,
 * no database. Each test states an outcome a user would notice.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { ProjectNotFoundError, ValidationError } from '@/lib/http/errors';
import { ProjectService } from '@/lib/services/project-service';

import { InMemoryProjectRepository, buildProjectInput } from './support/in-memory-project-repository';

let repository: InMemoryProjectRepository;
let service: ProjectService;

beforeEach(() => {
  repository = new InMemoryProjectRepository();
  service = new ProjectService(repository);
});

describe('creating a project', () => {
  it('stores a valid project and assigns it an id', async () => {
    const project = await service.create(buildProjectInput());

    expect(project.id).toBeGreaterThan(0);
    expect(project.clientName).toBe('Acme Corporation');
  });

  it('rejects invalid input with field-level errors', async () => {
    await expect(service.create(buildProjectInput({ clientName: '' }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('reports a 422 with the offending field named', async () => {
    try {
      await service.create(buildProjectInput({ dueDate: '2020-01-01' }));
      expect.unreachable('create should have thrown');
    } catch (error) {
      const validationError = error as ValidationError;
      expect(validationError.status).toBe(422);
      expect(validationError.fieldErrors?.dueDate).toBeDefined();
    }
  });

  it('does not persist anything when validation fails', async () => {
    await expect(service.create({})).rejects.toBeInstanceOf(ValidationError);
    await expect(service.list({})).resolves.toHaveLength(0);
  });
});

describe('reading projects', () => {
  it('returns a project by id', async () => {
    const created = await service.create(buildProjectInput());
    await expect(service.getById(created.id)).resolves.toMatchObject({ id: created.id });
  });

  it('accepts an id that arrives as a string from the URL', async () => {
    const created = await service.create(buildProjectInput());
    await expect(service.getById(String(created.id))).resolves.toMatchObject({ id: created.id });
  });

  it('throws NotFound for an id that does not exist', async () => {
    await expect(service.getById(4242)).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it('rejects a non-numeric id as a validation error rather than a 404', async () => {
    await expect(service.getById('abc')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('listing projects', () => {
  beforeEach(async () => {
    await service.create(
      buildProjectInput({
        clientName: 'Acme Corporation',
        projectName: 'Corporate Website Redesign',
        status: 'In Progress',
        priority: 'High',
        dueDate: '2026-07-15',
      }),
    );
    await service.create(
      buildProjectInput({
        clientName: 'GreenLeaf Cafe',
        projectName: 'Online Ordering System',
        description: 'Ordering platform for customers.',
        status: 'Planning',
        priority: 'Medium',
        dueDate: '2026-08-01',
      }),
    );
    await service.create(
      buildProjectInput({
        clientName: 'FreshFarm',
        projectName: 'Inventory Management System',
        status: 'On Hold',
        priority: 'Low',
        dueDate: '2026-06-30',
      }),
    );
  });

  it('returns everything when no filters are given', async () => {
    await expect(service.list({})).resolves.toHaveLength(3);
  });

  it('filters by status', async () => {
    const projects = await service.list({ status: 'On Hold' });
    expect(projects.map((project) => project.clientName)).toEqual(['FreshFarm']);
  });

  it('filters by priority', async () => {
    const projects = await service.list({ priority: 'High' });
    expect(projects.map((project) => project.clientName)).toEqual(['Acme Corporation']);
  });

  it('searches across client, project and description', async () => {
    await expect(service.list({ search: 'greenleaf' })).resolves.toHaveLength(1);
    await expect(service.list({ search: 'ordering platform' })).resolves.toHaveLength(1);
  });

  it('sorts by due date ascending by default', async () => {
    const projects = await service.list({});
    expect(projects.map((project) => project.dueDate)).toEqual([
      '2026-06-30',
      '2026-07-15',
      '2026-08-01',
    ]);
  });

  it('sorts priority by severity, not alphabetically', async () => {
    const projects = await service.list({ sort: 'priority', order: 'desc' });
    expect(projects.map((project) => project.priority)).toEqual(['High', 'Medium', 'Low']);
  });

  it('sorts status by lifecycle position, not alphabetically', async () => {
    const projects = await service.list({ sort: 'status', order: 'asc' });
    // Alphabetical order would put "On Hold" before "Planning".
    expect(projects.map((project) => project.status)).toEqual([
      'Planning',
      'In Progress',
      'On Hold',
    ]);
  });

  it('rejects an unsupported sort field instead of ignoring it', async () => {
    await expect(service.list({ sort: 'secretColumn' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('updating a project', () => {
  it('replaces the stored values', async () => {
    const created = await service.create(buildProjectInput());

    const updated = await service.update(
      created.id,
      buildProjectInput({ status: 'Completed', projectName: 'Website Redesign v2' }),
    );

    expect(updated).toMatchObject({ id: created.id, status: 'Completed' });
    expect(updated.projectName).toBe('Website Redesign v2');
  });

  it('throws NotFound for an id that does not exist', async () => {
    await expect(service.update(4242, buildProjectInput())).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it('validates the body before it looks the project up', async () => {
    // A bad payload for a missing id should read as a validation failure,
    // because the payload is what the caller needs to fix first.
    await expect(service.update(4242, { clientName: '' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a partial payload, since PUT is a full replacement', async () => {
    const created = await service.create(buildProjectInput());
    await expect(service.update(created.id, { status: 'Completed' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe('deleting a project', () => {
  it('removes the project', async () => {
    const created = await service.create(buildProjectInput());

    await service.remove(created.id);

    await expect(service.list({})).resolves.toHaveLength(0);
  });

  it('throws NotFound when the project is already gone', async () => {
    const created = await service.create(buildProjectInput());
    await service.remove(created.id);

    await expect(service.remove(created.id)).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
