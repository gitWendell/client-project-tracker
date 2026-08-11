/**
 * Seeds the database from the `test_data.json` supplied with the assessment.
 *
 * The file is validated with the same schema the API uses, so bad seed data
 * fails loudly here rather than surfacing as a broken row in the UI.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

import { parseIsoDate } from '@/lib/dates';
import { priorityRankOf, projectInputSchema } from '@/lib/validation/project';

const prisma = new PrismaClient();

const SEED_FILE = path.join(process.cwd(), 'test_data.json');

async function main() {
  const raw = await readFile(SEED_FILE, 'utf8');
  const rows: unknown = JSON.parse(raw);

  if (!Array.isArray(rows)) {
    throw new Error(`Expected ${SEED_FILE} to contain an array of projects.`);
  }

  const projects = rows.map((row, index) => {
    const parsed = projectInputSchema.safeParse(row);
    if (!parsed.success) {
      throw new Error(
        `Seed record #${index + 1} is invalid: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
    }

    const id = (row as { id?: unknown }).id;
    return {
      // Preserve the ids from the fixture so documented examples such as
      // `GET /api/projects/1` line up with the seeded data.
      id: typeof id === 'number' ? id : undefined,
      ...parsed.data,
      startDate: parseIsoDate(parsed.data.startDate)!,
      dueDate: parseIsoDate(parsed.data.dueDate)!,
      priorityRank: priorityRankOf(parsed.data.priority),
    };
  });

  await prisma.$transaction([
    prisma.project.deleteMany(),
    ...projects.map((data) => prisma.project.create({ data })),
  ]);

  console.log(`Seeded ${projects.length} projects from test_data.json`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
