import { z } from 'zod';

const supportedLanguages = ['python', 'c', 'cpp', 'javascript'];
const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];

export const explainCodeSchema = z.object({
  code: z
    .string({ required_error: 'Source code is required' })
    .trim()
    .min(1, 'Source code cannot be empty')
    .max(15000, 'Code exceeds maximum allowed size of 15,000 characters'),
  language: z
    .string({ required_error: 'Language is required' })
    .toLowerCase()
    .refine((val) => supportedLanguages.includes(val), {
      message: `Supported languages are: ${supportedLanguages.join(', ')}`,
    }),
});

export const debugCodeSchema = z.object({
  code: z
    .string({ required_error: 'Source code is required' })
    .trim()
    .min(1, 'Source code cannot be empty')
    .max(15000, 'Code exceeds maximum allowed size of 15,000 characters'),
  language: z
    .string({ required_error: 'Language is required' })
    .toLowerCase()
    .refine((val) => supportedLanguages.includes(val), {
      message: `Supported languages are: ${supportedLanguages.join(', ')}`,
    }),
  errorMessage: z.string().max(3000).optional().default(''),
  expectedBehavior: z.string().max(2000).optional().default(''),
});

export const practiceGenerateSchema = z.object({
  language: z
    .string({ required_error: 'Language is required' })
    .toLowerCase()
    .refine((val) => supportedLanguages.includes(val), {
      message: `Supported languages are: ${supportedLanguages.join(', ')}`,
    }),
  difficulty: z
    .string({ required_error: 'Difficulty is required' })
    .refine((val) => difficultyLevels.includes(val), {
      message: `Difficulty must be one of: ${difficultyLevels.join(', ')}`,
    }),
  topic: z
    .string({ required_error: 'Topic is required' })
    .trim()
    .min(2, 'Topic must be at least 2 characters')
    .max(100, 'Topic must be less than 100 characters'),
});

export const hintRequestSchema = z.object({
  problemId: z.string().uuid({ message: 'Valid problem UUID is required' }),
  level: z
    .number()
    .int()
    .min(1, 'Hint level must be between 1 and 4')
    .max(4, 'Level 5 full solution must be requested via the dedicated /solution endpoint'),
  currentCode: z.string().max(15000).optional().default(''),
});

export const solutionRequestSchema = z.object({
  problemId: z.string().uuid({ message: 'Valid problem UUID is required' }),
  confirmRequest: z.literal(true, {
    errorMap: () => ({ message: 'You must explicitly confirm you want to view the full solution' }),
  }),
});

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z
    .string({ required_error: 'Message content is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message cannot exceed 4,000 characters'),
  language: z.string().optional(),
});

