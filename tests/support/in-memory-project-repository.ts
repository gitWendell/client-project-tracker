/**
 * An in-memory stand-in for the database.
 *
 * This is the payoff of having the service depend on the `ProjectRepository`
 * interface: the business rules can be tested at full speed with no SQLite
 * file, no migrations and no cleanup between tests.
 */
import type { ProjectRepository } from '@/lib/repositories/project-repository';
import type { Project } from '@/lib/types';
import { priorityRankOf, type ProjectInput, type ProjectQuery } from '@/lib/validation/project';

export class InMemoryProjectRepository implements ProjectRepository {
  private projects: Project[] = [];
  private nextId = 1;

  constructor(seed: ProjectInput[] = []) {
    seed.forEach((input) => this.insert(input));
  }

  async findMany(query: ProjectQuery): Promise<Project[]> {
    const search = query.search?.toLowerCase();

    const matches = this.projects.filter((project) => {
      if (query.status && project.status !== query.status) return false;
      if (query.priority && project.priority !== query.priority) return false;
      if (!search) return true;

      return [project.clientName, project.projectName, project.description].some((field) =>
        field.toLowerCase().includes(search),
      );
    });

    const direction = query.order === 'desc' ? -1 : 1;

    return matches.sort((a, b) => {
      const [left, right] =
        query.sort === 'priority'
          ? [priorityRankOf(a.priority), priorityRankOf(b.priority)]
          : [a[query.sort], b[query.sort]];

      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      return a.id - b.id;
    });
  }

  async findById(id: number): Promise<Project | null> {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  async create(input: ProjectInput): Promise<Project> {
    return this.insert(input);
  }

  async update(id: number, input: ProjectInput): Promise<Project | null> {
    const index = this.projects.findIndex((project) => project.id === id);
    if (index === -1) return null;

    const updated: Project = {
      ...this.projects[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.projects[index] = updated;
    return updated;
  }

  async remove(id: number): Promise<boolean> {
    const index = this.projects.findIndex((project) => project.id === id);
    if (index === -1) return false;
    this.projects.splice(index, 1);
    return true;
  }

  private insert(input: ProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = { id: this.nextId++, ...input, createdAt: now, updatedAt: now };
    this.projects.push(project);
    return project;
  }
}

/** A valid payload; individual tests override just the field under test. */
export function buildProjectInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    clientName: 'Acme Corporation',
    projectName: 'Corporate Website Redesign',
    description: 'Redesign and modernize the corporate website.',
    status: 'In Progress',
    priority: 'High',
    startDate: '2026-06-01',
    dueDate: '2026-07-15',
    ...overrides,
  };
}
