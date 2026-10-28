import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { setActiveAIProvider } from '../src/services/ai/aiService.js';
import { AIProvider } from '../src/services/ai/aiProvider.js';

class MockAIProvider extends AIProvider {
  constructor() {
    super('mock-provider');
  }

  async healthCheck() {
    return {
      status: 'connected',
      provider: 'mock-provider',
      model: 'mock-v1',
      responseTimeMs: 10,
    };
  }

  async explain({ code, language }) {
    return {
      summary: `Explains ${language} code cleanly`,
      concepts: ['Iteration', 'Variables'],
      lineByLine: [
        { lines: '1', code, explanation: 'Primary execution statement' },
      ],
      exampleConcept: 'Variables hold values in memory.',
      executionNotice: 'Static analysis only.',
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }

  async debug({ code, language, errorMessage }) {
    return {
      problemDescription: 'Sample diagnosed problem',
      probableCause: 'Boundary mismatch',
      targetSection: code.split('\n')[0],
      suggestedFix: '// corrected line',
      whyFixHelps: 'Prevents out-of-bounds read',
      preventionTip: 'Double check array bounds',
      isDefiniteSyntaxError: false,
      isLogicalError: true,
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }

  async generatePractice({ language, difficulty, topic }) {
    return {
      title: `${topic} Challenge`,
      description: `Write a program in ${language} testing ${topic}.`,
      inputDescription: 'An integer N',
      outputDescription: 'Result value',
      constraints: '1 <= N <= 100',
      sampleInput: '5',
      sampleOutput: '10',
      conceptPracticed: topic,
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }

  async generateHint({ problem, level, currentCode }) {
    return {
      level,
      levelName: `Level ${level} Hint`,
      hint: `Ponder how to loop until condition holds.`,
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }

  async generateSolution({ problem }) {
    return {
      solutionCode: 'def solve(): pass',
      algorithmicStrategy: 'Linear scan',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      edgeCasesConsidered: ['N = 0'],
      disclaimer: 'Educational reference solution.',
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }

  async chat({ messages, language }) {
    return {
      message: 'Hello! I am your CodeBuddy AI tutor. What would you like to explore today?',
      provider: 'mock-provider',
      model: 'mock-v1',
    };
  }
}

describe('Express REST API Endpoints', () => {
  beforeEach(() => {
    setActiveAIProvider(new MockAIProvider());
  });

  describe('GET /api/health', () => {
    it('returns healthy status and version without auth', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBe('1.0.0');
    });
  });

  describe('GET /api/health/ai', () => {
    it('returns connected status for active AI provider', async () => {
      const res = await request(app).get('/api/health/ai');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('connected');
      expect(res.body.provider).toBe('mock-provider');
    });
  });

  describe('POST /api/ai/explain', () => {
    it('requires authentication (401 without Bearer header)', async () => {
      const res = await request(app).post('/api/ai/explain').send({
        code: 'print(42)',
        language: 'python',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid payload with 400 when language is missing', async () => {
      const res = await request(app)
        .post('/api/ai/explain')
        .set('Authorization', 'Bearer test-mock-token-user-1')
        .send({
          code: 'print(42)',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('successfully explains code with valid token and payload', async () => {
      const res = await request(app)
        .post('/api/ai/explain')
        .set('Authorization', 'Bearer test-mock-token-user-1')
        .send({
          code: 'print("hello world")',
          language: 'python',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toContain('Explains python code cleanly');
      expect(res.body.data.concepts).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/ai/hints & Progressive Hint Protection', () => {
    it('allows Level 1 through 4 hint request', async () => {
      const res = await request(app)
        .post('/api/ai/hints')
        .set('Authorization', 'Bearer test-mock-token-user-1')
        .send({
          problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          level: 2,
          currentCode: 'for x in range(5): pass',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.level).toBe(2);
      expect(res.body.data.hint).toBeDefined();
    });

    it('forbids requesting Level 5 via /hints (prevents accidental full solution leak)', async () => {
      const res = await request(app)
        .post('/api/ai/hints')
        .set('Authorization', 'Bearer test-mock-token-user-1')
        .send({
          problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          level: 5,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].message).toContain('Level 5 full solution must be requested via');
    });
  });

  describe('POST /api/ai/solution', () => {
    it('requires explicit confirmRequest: true to reveal Level 5 solution', async () => {
      const res = await request(app)
        .post('/api/ai/solution')
        .set('Authorization', 'Bearer test-mock-token-user-1')
        .send({
          problemId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          confirmRequest: true,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.solutionCode).toBeDefined();
      expect(res.body.data.algorithmicStrategy).toBeDefined();
    });
  });
});

