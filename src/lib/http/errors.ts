/**
 * Application error types.
 *
 * Services throw these; the HTTP layer is the only thing that knows how to
 * turn them into responses (src/lib/http/responses.ts). That keeps business
 * rules free of framework details and makes them testable in isolation.
 */

import type { ZodError } from 'zod';

export type FieldErrors = Record<string, string[]>;

/**
 * Flattens a ZodError into `{ field: [messages] }` — the shape the API returns
 * and the form consumes directly.
 */
export function toFieldErrors(error: ZodError): FieldErrors {
  const flattened = error.flatten();
  const fieldErrors: FieldErrors = { ...flattened.fieldErrors } as FieldErrors;

  // Cross-field failures carry no `path`, so they would otherwise vanish.
  if (flattened.formErrors.length > 0) {
    fieldErrors._form = flattened.formErrors;
  }

  return fieldErrors;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, code: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * The request was well-formed but the contents broke a business rule.
 * 422 rather than 400 so clients can distinguish "I sent garbage" from
 * "I sent valid JSON that you rejected".
 */
export class ValidationError extends AppError {
  constructor(fieldErrors: FieldErrors, message = 'The submitted data is invalid.') {
    super(message, 422, 'VALIDATION_ERROR', fieldErrors);
  }

  static fromZod(error: ZodError, message?: string): ValidationError {
    return new ValidationError(toFieldErrors(error), message);
  }
}

/** The request itself could not be understood (malformed JSON, bad id). */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ProjectNotFoundError extends NotFoundError {
  constructor(id: number) {
    super(`Project with id ${id} was not found.`);
  }
}
