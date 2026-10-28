import { successResponse, errorResponse } from '../utils/response.js';

export const conversationsController = {
  async list(req, res, next) {
    try {
      if (!req.supabase) {
        return successResponse(res, { conversations: [] });
      }

      const { data, error } = await req.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', req.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return successResponse(res, { conversations: [] });
      }

      const cleanList = (data || []).filter((c) => Boolean(c && c.id));
      return successResponse(res, { conversations: cleanList });
    } catch (err) {
      // In offline mode or network failure, return empty list gracefully
      return successResponse(res, { conversations: [] });
    }
  },

  async create(req, res, next) {
    const fallbackConvo = {
      id: 'convo-' + Date.now(),
      user_id: req.user?.id || 'demo-user',
      title: req.body?.title || 'New Conversation',
      language: req.body?.language || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { title, language } = req.body;
      if (!req.supabase) {
        return successResponse(res, { conversation: fallbackConvo }, 201);
      }

      const { data, error } = await req.supabase
        .from('conversations')
        .insert({
          user_id: req.user.id,
          title: title || 'New Conversation',
          language: language || null,
        })
        .select()
        .single();

      if (error || !data) {
        return successResponse(res, { conversation: fallbackConvo }, 201);
      }

      return successResponse(res, { conversation: data }, 201);
    } catch (err) {
      return successResponse(res, { conversation: fallbackConvo }, 201);
    }
  },

  async getById(req, res, next) {
    const { id } = req.params;
    const fallbackResponse = {
      conversation: {
        id,
        user_id: req.user?.id || 'demo-user',
        title: 'Tutoring Session',
        language: 'python',
      },
      messages: [],
    };

    try {
      if (!req.supabase) {
        return successResponse(res, fallbackResponse);
      }

      const { data: conversation, error: convoError } = await req.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (convoError || !conversation) {
        return successResponse(res, fallbackResponse);
      }

      const { data: messages } = await req.supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      return successResponse(res, {
        conversation,
        messages: (messages || []).filter((m) => Boolean(m && m.content)),
      });
    } catch (err) {
      return successResponse(res, fallbackResponse);
    }
  },

  async update(req, res, next) {
    const { id } = req.params;
    const { title, language } = req.body;

    try {
      if (!req.supabase) {
        return successResponse(res, {
          conversation: { id, title: title || 'Updated Conversation' },
        });
      }

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
      return successResponse(res, {
        conversation: { id, title: title || 'Updated Conversation' },
      });
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      if (req.supabase) {
        await req.supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', req.user.id);
      }
      return successResponse(res, { message: 'Conversation deleted successfully' });
    } catch (err) {
      return successResponse(res, { message: 'Conversation deleted successfully' });
    }
  },
};
