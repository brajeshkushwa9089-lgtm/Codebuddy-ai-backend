import { describe, it, expect } from 'vitest';
import {
  explainCodeSchema,
  debugCodeSchema,
  practiceGenerateSchema,
  hintRequestSchema,
  solutionRequestSchema,
} from '../src/validators/aiValidators.js';

describe('AI Input Validators (Zod Schemas)', () => {
  describe('explainCodeSchema', () => {
    it('accepts valid python code', () => {
      const result = explainCodeSchema.safeParse({
        code: 'print("hello world")',
        language: 'python',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty code', () => {
      const result = explainCodeSchema.safeParse({
        code: '   ',
        language: 'python',
      });
      expect(result.success).toBe(false);
    });

    it('rejects unsupported language', () => {
      const result = explainCodeSchema.safeParse({
        code: 'puts "hello"',
        language: 'ruby',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('Supported languages are');
    });
  });

  describe('hintRequestSchema & progressive limit', () => {
    it('accepts level 1 through 4', () => {
      const valid = hintRequestSchema.safeParse({
        problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        level: 3,
        currentCode: 'for i in range(10): pass',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects level 5 hint request (must use solution endpoint)', () => {
      const invalid = hintRequestSchema.safeParse({
        problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        level: 5,
      });
      expect(invalid.success).toBe(false);
      expect(invalid.error.issues[0].message).toContain('Level 5 full solution must be requested via');
    });
  });

  describe('solutionRequestSchema', () => {
    it('requires confirmRequest: true', () => {
      const valid = solutionRequestSchema.safeParse({
        problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        confirmRequest: true,
      });
      expect(valid.success).toBe(true);

      const invalid = solutionRequestSchema.safeParse({
        problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        confirmRequest: false,
      });
      expect(invalid.success).toBe(false);
    });
  });
});

