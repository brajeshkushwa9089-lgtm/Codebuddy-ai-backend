import { logger } from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';

/**
 * 404 Handler for undefined routes
 */
export function notFoundHandler(req, res) {
  return errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Centralized Global Error Handler
 */
export function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(
    res,
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : message,
    statusCode,
    process.env.NODE_ENV === 'development' ? err.stack : null
  );
}

