/**
 * Single-resource endpoints.
 *
 *   GET    /api/projects/:id   fetch one project
 *   PUT    /api/projects/:id   replace a project
 *   DELETE /api/projects/:id   delete a project
 *
 * PUT is a full replacement, matching the assessment's REST contract — the
 * body is validated against the same schema as POST, so a partial payload is
 * rejected rather than silently merged.
 */
import { noContent, ok, readJsonBody, withErrorHandling } from '@/lib/http/responses';
import { projectService } from '@/lib/services/project-service';

/** Next 15+ resolves dynamic route params asynchronously. */
type RouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<RouteContext>(async (_request, { params }) => {
  const { id } = await params;
  return ok(await projectService.getById(id));
});

export const PUT = withErrorHandling<RouteContext>(async (request, { params }) => {
  const { id } = await params;
  const body = await readJsonBody(request);
  return ok(await projectService.update(id, body));
});

export const DELETE = withErrorHandling<RouteContext>(async (_request, { params }) => {
  const { id } = await params;
  await projectService.remove(id);
  // 204: the deletion succeeded and there is nothing left to return.
  return noContent();
});
