/**
 * Base AI Provider Abstract Interface.
 * All concrete providers (Ollama, Gemini, Mock) must inherit and implement these methods.
 */
export class AIProvider {
  constructor(name) {
    if (new.target === AIProvider) {
      throw new TypeError('Cannot construct AIProvider instances directly');
    }
    this.name = name;
  }

  /**
   * Health check to verify provider connectivity and model readiness.
   * @returns {Promise<{ status: 'connected' | 'error', provider: string, model: string, responseTimeMs?: number, error?: string }>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }

  /**
   * Interactive tutoring chat with conversational context.
   */
  async chat({ messages, language }) {
    throw new Error('chat() must be implemented');
  }

  /**
   * Explains source code with line-by-line breakdown.
   */
  async explain({ code, language }) {
    throw new Error('explain() must be implemented');
  }

  /**
   * Diagnoses bugs and suggests minimal fixes.
   */
  async debug({ code, language, errorMessage, expectedBehavior }) {
    throw new Error('debug() must be implemented');
  }

  /**
   * Generates a practice problem.
   */
  async generatePractice({ language, difficulty, topic }) {
    throw new Error('generatePractice() must be implemented');
  }

  /**
   * Generates a single level hint.
   */
  async generateHint({ problem, level, currentCode }) {
    throw new Error('generateHint() must be implemented');
  }

  /**
   * Generates full Level 5 solution and walkthrough.
   */
  async generateSolution({ problem }) {
    throw new Error('generateSolution() must be implemented');
  }

  /**
   * Helper utility to safely extract JSON from LLM responses, stripping codeblocks if present.
   */
  extractJson(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Empty response from AI model');
    }

    // Try finding JSON inside ```json ... ``` or ``` ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = codeBlockMatch ? codeBlockMatch[1] : text;

    try {
      return JSON.parse(candidate.trim());
    } catch {
      // Find the first { and the last }
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const sliced = candidate.slice(firstBrace, lastBrace + 1);
        return JSON.parse(sliced);
      }
      throw new Error(`Failed to parse structured JSON from AI output: ${text.slice(0, 120)}...`);
    }
  }
}

