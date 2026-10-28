import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter to protect against spamming
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP. Please take a quick break and try again later.',
      statusCode: 429,
    },
  },
});

/**
 * Stricter rate limiter for AI-intensive endpoints (explain, debug, generate, chat)
 */
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60, // 60 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'You have reached the AI request limit for this 5-minute window. Please wait a moment before sending another request.',
      statusCode: 429,
    },
  },
});

