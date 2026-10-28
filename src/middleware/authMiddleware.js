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

    // Verify token with Supabase Auth
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Supabase token verification failed', { error: error?.message });
      return errorResponse(res, 'Invalid or expired session token. Please re-authenticate.', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'authenticated',
    };
    req.token = token;
    req.supabase = createUserScopedSupabase(token);

    next();
  } catch (err) {
    logger.error('Unexpected error in auth middleware', err);
    return errorResponse(res, 'Authentication verification failed.', 500);
  }
}

