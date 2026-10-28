import { describe, it, expect, vi } from 'vitest';
import { OllamaProvider } from '../src/services/ai/ollamaProvider.js';
import { GeminiProvider } from '../src/services/ai/geminiProvider.js';
import { AIProvider } from '../src/services/ai/aiProvider.js';

describe('AI Provider Abstraction Layer', () => {
  describe('AIProvider Base Class & JSON Extraction', () => {
    class TestConcreteProvider extends AIProvider {
      constructor() {
        super('test');
      }
    }

    const provider = new TestConcreteProvider();

    it('extracts raw JSON cleanly', () => {
      const json = '{"summary": "Test summary", "concepts": ["Loops"]}';
      const parsed = provider.extractJson(json);
      expect(parsed.summary).toBe('Test summary');
      expect(parsed.concepts).toContain('Loops');
    });

    it('extracts JSON enclosed within markdown codeblocks', () => {
      const markdown = 'Here is the analysis:\n```json\n{"summary": "Hello inside markdown"}\n```\nHope this helps!';
      const parsed = provider.extractJson(markdown);
      expect(parsed.summary).toBe('Hello inside markdown');
    });

    it('extracts embedded JSON without codeblocks', () => {
      const embedded = 'Sure! Here is the JSON: {"level": 2, "hint": "Use two pointers"} Thanks.';
      const parsed = provider.extractJson(embedded);
      expect(parsed.level).toBe(2);
      expect(parsed.hint).toBe('Use two pointers');
    });

    it('throws meaningful error if invalid text has no JSON braces', () => {
      expect(() => provider.extractJson('Just plain text without braces')).toThrow(
        /Failed to parse structured JSON/
      );
    });
  });

  describe('OllamaProvider Error Handling & Health Check', () => {
    it('returns clean diagnostic when Ollama daemon is unreachable', async () => {
      const ollama = new OllamaProvider({
        ollama: { baseUrl: 'http://127.0.0.1:9999', model: 'gemma3:1b' },
        timeoutMs: 1000,
      });

      const health = await ollama.healthCheck();
      expect(health.status).toBe('error');
      expect(health.error).toContain('Cannot connect to Ollama daemon');
    });
  });

  describe('GeminiProvider Error Handling & Health Check', () => {
    it('returns error if GEMINI_API_KEY is not configured', async () => {
      const gemini = new GeminiProvider({
        gemini: { apiKey: '', model: 'gemini-1.5-flash' },
      });

      const health = await gemini.healthCheck();
      expect(health.status).toBe('error');
      expect(health.error).toContain('GEMINI_API_KEY is not configured');
    });

    it('throws error on chat if GEMINI_API_KEY is missing', async () => {
      const gemini = new GeminiProvider({
        gemini: { apiKey: '', model: 'gemini-1.5-flash' },
      });

      await expect(gemini.chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
        /GEMINI_API_KEY is missing/
      );
    });
  });
});

