import { z } from 'zod';

export const practiceIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid problem UUID format' }),
});

export const submitAttemptSchema = z.object({
  submittedCode: z.string().max(30000, 'Submitted code exceeds maximum size of 30,000 characters'),
  hintsUsed: z.number().int().min(0).max(5).default(0),
  completed: z.boolean().default(false),
});

