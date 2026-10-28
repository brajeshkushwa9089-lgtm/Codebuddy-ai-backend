import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().trim().max(100).optional().default('New Conversation'),
  language: z.string().max(30).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(100).optional(),
  language: z.string().max(30).optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid conversation UUID format' }),
});

