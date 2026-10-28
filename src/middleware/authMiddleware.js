import { getSupabase, createUserScopedSupabase } from '../services/supabase/supabaseClient.js';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware that verifies the Supabase JWT.
 * Attaches req.user, req.token, and req.supabase (user-scoped client) to the request.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authorization token required. Please sign in.', 401);
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      return errorResponse(res, 'Malformed Bearer token.', 401);
    }

    // Support mock testing token in development or test environment
    if (
      (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') &&
      token.startsWith('test-mock-token-')
    ) {
      const mockUserId = token.replace('test-mock-token-', '') || 'test-user-id';
      req.user = {
        id: mockUserId,
        email: `${mockUserId}@test.local`,
        role: 'authenticated',
      };
      req.token = token;
      req.supabase = createUserScopedSupabase(token);
      return next();
    }

    // Verify token with Supabase Auth or offline JWT decoding
    const supabase = getSupabase();
    let user = null;

    try {
      const authPromise = supabase.auth.getUser(token);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase auth network timeout')), 3000)
      );

      const res = await Promise.race([authPromise, timeoutPromise]);
      user = res?.data?.user;
    } catch (networkErr) {
      logger.warn('Supabase remote auth check timed out or unreachable (offline mode)', { error: networkErr.message });
    }

    // If remote check succeeded
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || 'authenticated',
      };
      req.token = token;
      req.supabase = createUserScopedSupabase(token);
      return next();
    }

    // Offline / Network fallback in development: decode JWT payload if valid
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload && payload.sub) {
            req.user = {
              id: payload.sub,
              email: payload.email || `${payload.sub}@offline.local`,
              role: payload.role || 'authenticated',
            };
            req.token = token;
            req.supabase = createUserScopedSupabase(token);
            logger.info(`Offline auth: verified session for user ${req.user.email}`);
            return next();
          }
        }
      } catch (decodeErr) {
        // Fallthrough to 401
      }
    }

    return errorResponse(res, 'Invalid or expired session token. Please sign in.', 401);
  } catch (err) {
    logger.error('Unexpected error in auth middleware', err);
    return errorResponse(res, 'Authentication verification failed.', 500);
  }
}

