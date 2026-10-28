import { successResponse, errorResponse } from '../utils/response.js';

export const profileController = {
  async getProfile(req, res, next) {
    try {
      const { data, error } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      // Gracefully handle missing database table or missing row
      if (
        error &&
        (error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          error.code === '42P01')
      ) {
        return successResponse(res, {
          profile: {
            id: req.user.id,
            display_name: req.user.email?.split('@')[0] || 'Student',
            isDbPending: true,
          },
        });
      }

      if (error && error.code === 'PGRST116') {
        // Row not found, create initial profile
        const { data: newProfile, error: insertError } = await req.supabase
          .from('profiles')
          .insert({
            id: req.user.id,
            display_name: req.user.email?.split('@')[0] || 'Student',
          })
          .select()
          .single();

        if (insertError) {
          return successResponse(res, {
            profile: {
              id: req.user.id,
              display_name: req.user.email?.split('@')[0] || 'Student',
            },
          });
        }
        return successResponse(res, { profile: newProfile });
      }

      if (error) {
        return successResponse(res, {
          profile: {
            id: req.user.id,
            display_name: req.user.email?.split('@')[0] || 'Student',
          },
        });
      }

      return successResponse(res, { profile: data });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { displayName } = req.body;

      const { data, error } = await req.supabase
        .from('profiles')
        .upsert({
          id: req.user.id,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return successResponse(res, {
          profile: {
            id: req.user.id,
            display_name: displayName,
          },
        });
      }

      return successResponse(res, { profile: data });
    } catch (err) {
      next(err);
    }
  },
};
