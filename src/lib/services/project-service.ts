/**
 * Business rules for projects.
 *
 * Validation lives here rather than in the route handlers, so the rules hold
 * for every caller — HTTP today, a queue worker or CLI tomorrow. The service
 * knows nothing about requests, responses or status codes; it throws typed
 * errors and lets the HTTP layer translate them.
 */
import { ValidationError, ProjectNotFoundError } from '@/lib/http/errors';
import {
  PrismaProjectRepository,
  type ProjectRepository,
} from '@/lib/repositories/project-repository';
import type { Project } from '@/lib/types';
import { projectIdSchema, projectInputSchema, projectQuerySchema } from '@/lib/validation/project';

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async list(rawQuery: unknown): Promise<Project[]> {
    const query = projectQuerySchema.safeParse(rawQuery);
    if (!query.success) {
      throw ValidationError.fromZod(query.error, 'Invalid search or filter parameters.');
    }

    return this.repository.findMany(query.data);
  }

  async getById(rawId: unknown): Promise<Project> {
    const id = this.parseId(rawId);
    const project = await this.repository.findById(id);
    if (!project) throw new ProjectNotFoundError(id);
    return project;
  }

  async create(rawInput: unknown): Promise<Project> {
    const input = this.parseInput(rawInput);
    return this.repository.create(input);
  }

  async update(rawId: unknown, rawInput: unknown): Promise<Project> {
    const id = this.parseId(rawId);
    const input = this.parseInput(rawInput);

    const updated = await this.repository.update(id, input);
    if (!updated) throw new ProjectNotFoundError(id);
    return updated;
  }

  async remove(rawId: unknown): Promise<void> {
    const id = this.parseId(rawId);
    const deleted = await this.repository.remove(id);
    if (!deleted) throw new ProjectNotFoundError(id);
  }

  private parseId(rawId: unknown): number {
    const result = projectIdSchema.safeParse(rawId);
    if (!result.success) {
      // A malformed id is a bad URL, not a bad payload — surface it as a
      // 422 with the offending field named, consistent with other failures.
      throw new ValidationError({ id: result.error.issues.map((issue) => issue.message) });
    }
    return result.data;
  }

  private parseInput(rawInput: unknown) {
    const result = projectInputSchema.safeParse(rawInput);
    if (!result.success) throw ValidationError.fromZod(result.error);
    return result.data;
  }
}

/** The instance used by the API routes. */
export const projectService = new ProjectService(new PrismaProjectRepository());
