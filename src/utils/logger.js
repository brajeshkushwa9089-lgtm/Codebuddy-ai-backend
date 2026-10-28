/**
 * Safe logger that sanitizes headers, tokens, and credentials.
 */
function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('key') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('auth') ||
      lower.includes('password')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

export const logger = {
  info: (msg, meta) => {
    if (meta) {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, sanitize(meta));
    } else {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`);
    }
  },
  warn: (msg, meta) => {
    if (meta) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, sanitize(meta));
    } else {
      console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`);
    }
  },
  error: (msg, error) => {
    const errorDetails = error instanceof Error
      ? { message: error.message, code: error.code }
      : error;
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, sanitize(errorDetails));
  },
};

