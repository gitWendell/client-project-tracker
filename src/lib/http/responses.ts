/**
 * The one place that turns values and errors into HTTP responses.
 *
 * Every endpoint answers in the same envelope — `{ data }` on success,
 * `{ error: { code, message, fieldErrors? } }` on failure — so clients can
 * write a single response handler instead of one per endpoint.
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AppError, BadRequestError, ValidationError, type FieldErrors } from '@/lib/http/errors';
import type { ApiFailure, ApiSuccess } from '@/lib/types';

export { toFieldErrors } from '@/lib/http/errors';

export function ok<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status: 201 });
}

/** 204 has no body by definition, so nothing is serialised here. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function failure(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
): NextResponse<ApiFailure> {
  return NextResponse.json({ error: { code, message, ...(fieldErrors && { fieldErrors }) } }, { status });
}

/**
 * Maps any thrown value to a response. Unrecognised errors become a generic
 * 500: internal details are logged, never sent to the client.
 */
export function toErrorResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof AppError) {
    return failure(error.status, error.code, error.message, error.fieldErrors);
  }

  // A ZodError that escaped a service boundary is still a validation failure.
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZod(error);
    return failure(
      validationError.status,
      validationError.code,
      validationError.message,
      validationError.fieldErrors,
    );
  }

  if (error instanceof SyntaxError) {
    return failure(400, 'BAD_REQUEST', 'Request body must be valid JSON.');
  }

  console.error('Unhandled API error:', error);
  return failure(500, 'INTERNAL_ERROR', 'Something went wrong on our end. Please try again.');
}

type RouteHandler<TContext> = (request: Request, context: TContext) => Promise<NextResponse>;

/**
 * Wraps a route handler so no endpoint has to repeat try/catch. Anything that
 * throws — validation, not found, a database fault — lands in one mapper.
 */
export function withErrorHandling<TContext>(handler: RouteHandler<TContext>): RouteHandler<TContext> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Reads a JSON body, converting parse failures into a 400 rather than a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON.');
  }
}
