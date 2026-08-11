/**
 * Collection endpoints.
 *
 *   GET  /api/projects   list projects (search, filter, sort)
 *   POST /api/projects   create a project
 *
 * Handlers stay this thin on purpose: parse the transport, delegate, format.
 * Validation and business rules live in the service; error translation lives
 * in `withErrorHandling`.
 */
import { created, ok, readJsonBody, withErrorHandling } from '@/lib/http/responses';
import { projectService } from '@/lib/services/project-service';

export const GET = withErrorHandling(async (request) => {
  const { searchParams } = new URL(request.url);
  const projects = await projectService.list(Object.fromEntries(searchParams));
  return ok(projects);
});

export const POST = withErrorHandling(async (request) => {
  const body = await readJsonBody(request);
  const project = await projectService.create(body);
  return created(project);
});
