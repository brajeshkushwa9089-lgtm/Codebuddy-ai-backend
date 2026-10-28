import axios from 'axios';
import { AIProvider } from './aiProvider.js';
import {
  BASE_SYSTEM_PROMPT,
  EXPLAINER_PROMPT,
  DEBUGGER_PROMPT,
  PRACTICE_GENERATOR_PROMPT,
  HINT_LEVELS,
  SOLUTION_PROMPT,
} from './systemPrompts.js';
import { logger } from '../../utils/logger.js';

export class OllamaProvider extends AIProvider {
  constructor(config) {
    super('ollama');
    this.baseUrl = config.ollama.baseUrl.replace(/\/+$/, '');
    this.model = config.ollama.model;
    this.timeoutMs = config.timeoutMs || 60000;
  }

  /**
   * Health check verifying Ollama connection and model presence.
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      const models = response.data?.models || [];
      const modelExists = models.some(
        (m) => m.name === this.model || m.name.startsWith(`${this.model}:`)
      );

      if (!modelExists) {
        return {
          status: 'error',
          provider: 'ollama',
          model: this.model,
          responseTimeMs: Date.now() - startTime,
          error: `Ollama is running, but model '${this.model}' is not installed. Run 'ollama pull ${this.model}' in your terminal.`,
        };
      }

      return {
        status: 'connected',
        provider: 'ollama',
        model: this.model,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        status: 'error',
        provider: 'ollama',
        model: this.model,
        responseTimeMs: Date.now() - startTime,
        error: `Cannot connect to Ollama daemon at ${this.baseUrl}. Please verify 'ollama serve' is active.`,
      };
    }
  }

  /**
   * Internal dispatcher to Ollama /api/chat
   */
  async _sendChat(messages, { jsonFormat = false } = {}) {
    try {
      const payload = {
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: 0.2, // lower temperature for precise pedagogical code analysis
        },
      };

      if (jsonFormat) {
        payload.format = 'json';
      }

      const response = await axios.post(`${this.baseUrl}/api/chat`, payload, {
        timeout: this.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const content = response.data?.message?.content;
      if (!content) {
        throw new Error('Ollama returned empty message content');
      }
      return content;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama daemon at ${this.baseUrl}. Ensure 'ollama serve' is running.`);
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error(`Ollama request timed out after ${this.timeoutMs / 1000} seconds.`);
      }
      if (err.response?.status === 404) {
        throw new Error(`Model '${this.model}' not found in Ollama. Run 'ollama pull ${this.model}' first.`);
      }
      logger.error('Ollama request error', err);
      throw new Error(err.response?.data?.error || err.message || 'Ollama AI generation failed');
    }
  }

  async chat({ messages, language }) {
    const systemInstruction = `${BASE_SYSTEM_PROMPT}\nTarget programming language context: ${language || 'general'}`;
    const formattedMessages = [
      { role: 'system', content: systemInstruction },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const reply = await this._sendChat(formattedMessages, { jsonFormat: false });
    return {
      message: reply,
      provider: 'ollama',
      model: this.model,
    };
  }

  async explain({ code, language }) {
    const messages = [
      { role: 'system', content: EXPLAINER_PROMPT },
      {
        role: 'user',
        content: `Programming Language: ${language}\n\nStudent Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nExplain this code line-by-line and summarize it.`,
      },
    ];

    const rawJson = await this._sendChat(messages, { jsonFormat: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'ollama',
      model: this.model,
    };
  }

  async debug({ code, language, errorMessage, expectedBehavior }) {
    const messages = [
      { role: 'system', content: DEBUGGER_PROMPT },
      {
        role: 'user',
        content: `Language: ${language}\n\nStudent Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nReported Error/Symptom: ${
          errorMessage || 'Not provided by student'
        }\nExpected Behavior: ${
          expectedBehavior || 'Not provided by student'
        }\n\nDiagnose the issue and provide a minimal fix.`,
      },
    ];

    const rawJson = await this._sendChat(messages, { jsonFormat: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'ollama',
      model: this.model,
    };
  }

  async generatePractice({ language, difficulty, topic }) {
    const messages = [
      { role: 'system', content: PRACTICE_GENERATOR_PROMPT },
      {
        role: 'user',
        content: `Generate a ${difficulty} level practice problem for ${language} focused on the topic: "${topic}".`,
      },
    ];

    const rawJson = await this._sendChat(messages, { jsonFormat: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      language,
      difficulty,
      topic,
      provider: 'ollama',
      model: this.model,
    };
  }

  async generateHint({ problem, level, currentCode }) {
    const hintSpec = HINT_LEVELS[level] || HINT_LEVELS[1];
    const messages = [
      {
        role: 'system',
        content: `${BASE_SYSTEM_PROMPT}\n\nYou are providing a Level ${level} (${hintSpec.name}) hint to a student working on a problem.\nInstruction: ${hintSpec.instruction}\nCRITICAL: DO NOT REVEAL THE COMPLETE SOLUTION. Output pure JSON format: { "hint": "hint text" }`,
      },
      {
        role: 'user',
        content: `Problem: ${problem.title}\nDescription: ${problem.description}\nLanguage: ${problem.language}\nStudent's Current Attempt:\n\`\`\`${problem.language}\n${currentCode || 'No code written yet'}\n\`\`\`\n\nProvide the Level ${level} hint.`,
      },
    ];

    const rawJson = await this._sendChat(messages, { jsonFormat: true });
    const parsed = this.extractJson(rawJson);

    return {
      level,
      levelName: hintSpec.name,
      hint: parsed.hint || rawJson,
      provider: 'ollama',
      model: this.model,
    };
  }

  async generateSolution({ problem }) {
    const messages = [
      { role: 'system', content: SOLUTION_PROMPT },
      {
        role: 'user',
        content: `Problem Title: ${problem.title}\nDescription: ${problem.description}\nLanguage: ${problem.language}\nConstraints: ${problem.constraints}\n\nProvide the complete pedagogical solution.`,
      },
    ];

    const rawJson = await this._sendChat(messages, { jsonFormat: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'ollama',
      model: this.model,
    };
  }
}

