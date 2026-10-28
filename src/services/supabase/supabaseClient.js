import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let supabaseClient = null;
let adminClient = null;

function createMockSupabaseClient() {
  const queryBuilder = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    delete: () => queryBuilder,
    upsert: () => queryBuilder,
    eq: () => queryBuilder,
    in: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: async () => ({ data: null, error: null }),
    then: (resolve) => resolve({ data: [], error: null }),
  };

  return {
    from: () => queryBuilder,
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Mock mode') }),
    },
  };
}

/**
 * Initializes and returns the primary Supabase client.
 * Uses serviceRoleKey if available to authenticate backend PostgREST requests properly.
 */
export function getSupabase() {
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey || config.supabase.publishableKey;

  if (process.env.NODE_ENV === 'test' || !url || !key || url.includes('placeholder')) {
    return createMockSupabaseClient();
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Admin Supabase client using Service Role Secret for server-side elevated tasks.
 */
export function getAdminSupabase() {
  const url = config.supabase.url;
  const serviceKey = config.supabase.serviceRoleKey || config.supabase.publishableKey;

  if (!url || !serviceKey || serviceKey.includes('placeholder')) {
    return getSupabase();
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}

/**
 * Creates a scoped Supabase client with the caller's JWT access token.
 * This guarantees that Supabase Row Level Security (RLS) applies to the exact authenticated user.
 */
export function createUserScopedSupabase(accessToken) {
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey || config.supabase.publishableKey;

  if (
    process.env.NODE_ENV === 'test' ||
    !url ||
    !key ||
    url.includes('placeholder') ||
    accessToken?.startsWith('test-mock-token')
  ) {
    return createMockSupabaseClient();
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
