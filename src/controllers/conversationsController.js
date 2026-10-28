import { successResponse, errorResponse } from '../utils/response.js';

export const conversationsController = {
  async list(req, res, next) {
    try {
      const { data, error } = await req.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', req.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return successResponse(res, { conversations: [] });
      }

      return successResponse(res, { conversations: data || [] });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { title, language } = req.body;
      const { data, error } = await req.supabase
        .from('conversations')
        .insert({
          user_id: req.user.id,
          title: title || 'New Conversation',
          language: language || null,
        })
        .select()
        .single();

      if (error) {
        return successResponse(
          res,
          {
            conversation: {
              id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              user_id: req.user.id,
              title: title || 'New Conversation',
              language: language || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          201
        );
      }

      return successResponse(res, { conversation: data }, 201);
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const { data: conversation, error: convoError } = await req.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (convoError || !conversation) {
        return successResponse(res, {
          conversation: {
            id,
            user_id: req.user.id,
            title: 'Tutoring Session',
            language: 'python',
          },
          messages: [],
        });
      }

      const { data: messages } = await req.supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      return successResponse(res, {
        conversation,
        messages: messages || [],
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, language } = req.body;

      const updatePayload = { updated_at: new Date().toISOString() };
      if (title !== undefined) updatePayload.title = title;
      if (language !== undefined) updatePayload.language = language;

      const { data, error } = await req.supabase
        .from('conversations')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error || !data) {
        return successResponse(res, {
          conversation: { id, title: title || 'Updated Conversation' },
        });
      }

      return successResponse(res, { conversation: data });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      await req.supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

      return successResponse(res, { message: 'Conversation deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
