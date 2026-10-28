/**
 * Unified API Response utilities
 */
export function successResponse(res, data = {}, statusCode = 200, message = null) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

export function errorResponse(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  const body = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };
  if (details && process.env.NODE_ENV !== 'production') {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
}

