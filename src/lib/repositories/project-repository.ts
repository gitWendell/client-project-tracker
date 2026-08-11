/**
 * Persistence boundary.
 *
 * The service layer depends on the `ProjectRepository` interface, never on
 * Prisma. That buys two things: the business rules can be unit tested against
 * an in-memory fake (see tests/), and swapping SQLite for Postgres — or for a
 * completely different store — touches this file only.
 */
import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { parseIsoDate, toIsoDate } from '@/lib/dates';
import type { Project } from '@/lib/types';
import {
  priorityRankOf,
  statusRankOf,
  type ProjectInput,
  type ProjectPriority,
  type ProjectQuery,
  type ProjectStatus,
} from '@/lib/validation/project';

export interface ProjectRepository {
  findMany(query: ProjectQuery): Promise<Project[]>;
  findById(id: number): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  /** Resolves to `null` when the id does not exist. */
  update(id: number, input: ProjectInput): Promise<Project | null>;
  /** Resolves to `false` when the id does not exist. */
  remove(id: number): Promise<boolean>;
}

/** Prisma row -> API shape. Dates become strings, internals are dropped. */
function toDomain(row: {
  id: number;
  clientName: string;
  projectName: string;
  description: string;
  status: string;
  priority: string;
  startDate: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: row.id,
    clientName: row.clientName,
    projectName: row.projectName,
    description: row.description,
    status: row.status as ProjectStatus,
    priority: row.priority as ProjectPriority,
    startDate: toIsoDate(row.startDate),
    dueDate: toIsoDate(row.dueDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** API shape -> Prisma row, including the derived priority sort key. */
function toRow(input: ProjectInput) {
  return {
    clientName: input.clientName,
    projectName: input.projectName,
    description: input.description,
    status: input.status,
    priority: input.priority,
    // Non-null: the schema has already proven these are real calendar dates.
    startDate: parseIsoDate(input.startDate)!,
    dueDate: parseIsoDate(input.dueDate)!,
    priorityRank: priorityRankOf(input.priority),
    statusRank: statusRankOf(input.status),
  };
}

/** Sort fields whose column in the database is a derived rank, not the value. */
const RANKED_SORT_COLUMNS: Partial<Record<ProjectQuery['sort'], string>> = {
  priority: 'priorityRank',
  status: 'statusRank',
};

function buildWhere(query: ProjectQuery): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  if (query.search) {
    // SQLite's LIKE is already case-insensitive for ASCII, which is why there
    // is no `mode: 'insensitive'` here (SQLite does not support it).
    where.OR = [
      { clientName: { contains: query.search } },
      { projectName: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  return where;
}

function buildOrderBy(query: ProjectQuery): Prisma.ProjectOrderByWithRelationInput[] {
  const { sort, order } = query;
  // Priority and status are ordered by their derived ranks so that High beats
  // Medium and Planning precedes Completed, rather than sorting the words.
  // `id` is the tiebreaker that keeps the order stable between requests.
  const column = RANKED_SORT_COLUMNS[sort] ?? sort;

  return [{ [column]: order }, { id: 'asc' }];
}

export class PrismaProjectRepository implements ProjectRepository {
  async findMany(query: ProjectQuery): Promise<Project[]> {
    const rows = await prisma.project.findMany({
      where: buildWhere(query),
      orderBy: buildOrderBy(query),
    });
    return rows.map(toDomain);
  }

  async findById(id: number): Promise<Project | null> {
    const row = await prisma.project.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(input: ProjectInput): Promise<Project> {
    const row = await prisma.project.create({ data: toRow(input) });
    return toDomain(row);
  }

  async update(id: number, input: ProjectInput): Promise<Project | null> {
    // updateMany reports a count instead of throwing, which keeps "missing
    // row" an ordinary result rather than an exception to pattern-match on.
    const { count } = await prisma.project.updateMany({ where: { id }, data: toRow(input) });
    if (count === 0) return null;
    return this.findById(id);
  }

  async remove(id: number): Promise<boolean> {
    const { count } = await prisma.project.deleteMany({ where: { id } });
    return count > 0;
  }
}
