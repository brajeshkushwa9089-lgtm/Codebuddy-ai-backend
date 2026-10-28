import { errorResponse } from '../utils/response.js';

/**
 * Higher-order middleware to validate incoming request data using Zod schemas.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'params' | 'query'} [source='body'] - Part of request to validate
 */
export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const issues = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return errorResponse(res, 'Request validation failed', 400, issues);
      }
      return errorResponse(res, 'Invalid request payload', 400);
    }
  };
}

