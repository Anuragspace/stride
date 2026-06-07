import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../lib/errors';
import { ZodError } from 'zod';

interface ErrorResponse {
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta: null;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: Record<string, string[]> | undefined;

  if (err instanceof ValidationError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.errors;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'body';
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }

  // Always log server errors — critical for debugging in production (Render logs)
  if (statusCode >= 500) {
    console.error(`[Error] ${statusCode} (${code}): ${err.message}`);
    console.error(err.stack);
  } else if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${statusCode} (${code}):`, err.message);
    if (details) console.error('Details:', details);
  }

  const response: ErrorResponse = {
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: null,
  };

  res.status(statusCode).json(response);
}
