import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiProvider extends AIProvider {
  constructor(config) {
    super('gemini');
    this.apiKey = config.gemini.apiKey || '';
    this.modelName = config.gemini.model || 'gemini-flash-lite-latest';
    this.timeoutMs = config.timeoutMs || 60000;
    this.lastHealthCheck = null;
    this.lastHealthCheckTime = 0;

    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    } else {
      this.client = null;
    }
  }

  /**
   * Validates API connectivity with Gemini using countTokens to avoid consuming daily generateContent quota.
   * Caches results for 60 seconds to avoid unnecessary network roundtrips.
   */
  async healthCheck() {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        status: 'error',
        provider: 'gemini',
        model: this.modelName,
        responseTimeMs: Date.now() - startTime,
        error: 'GEMINI_API_KEY is not configured in backend/.env',
      };
    }

    const now = Date.now();
    if (this.lastHealthCheck && this.lastHealthCheck.status === 'connected' && (now - this.lastHealthCheckTime < 60000)) {
      return {
        ...this.lastHealthCheck,
        responseTimeMs: 0,
      };
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      await Promise.race([
        model.countTokens('health check ping'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout during Gemini health check')), 8000)
        ),
      ]);

      const result = {
        status: 'connected',
        provider: 'gemini',
        model: this.modelName,
        responseTimeMs: Date.now() - startTime,
      };
      this.lastHealthCheck = result;
      this.lastHealthCheckTime = now;
      return result;
    } catch (err) {
      // If primary model failed (e.g. 404 or quota), test available fallback models
      const fallbackModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];
      for (const altModel of fallbackModels) {
        if (altModel === this.modelName) continue;
        try {
          const alt = this.client.getGenerativeModel({ model: altModel });
          await alt.countTokens('health check ping');
          this.modelName = altModel;
          const result = {
            status: 'connected',
            provider: 'gemini',
            model: this.modelName,
            responseTimeMs: Date.now() - startTime,
          };
          this.lastHealthCheck = result;
          this.lastHealthCheckTime = now;
          return result;
        } catch {
          // continue to next fallback
        }
      }

      logger.error('Gemini healthCheck failed', err);
      return {
        status: 'error',
        provider: 'gemini',
        model: this.modelName,
        responseTimeMs: Date.now() - startTime,
        error: err.message || 'Failed to authenticate or connect with Google Gemini API',
      };
    }
  }

  async _generate(systemInstruction, userPrompt, { jsonMode = false } = {}) {
    if (!this.apiKey || !this.client) {
      throw new Error('GEMINI_API_KEY is missing. Please configure it in your backend environment.');
    }

    const candidateModels = [
      this.modelName,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastErr = null;

    for (const candidate of candidateModels) {
      try {
        const generationConfig = {
          temperature: 0.2,
        };

        if (jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        const model = this.client.getGenerativeModel({
          model: candidate,
          systemInstruction,
          generationConfig,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini request timed out after ${this.timeoutMs / 1000}s`)), this.timeoutMs)
        );

        const result = await Promise.race([
          model.generateContent(userPrompt),
          timeoutPromise,
        ]);

        const text = result.response.text();
        this.modelName = candidate;
        return text;
      } catch (err) {
        lastErr = err;
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 404) {
          logger.warn(`Gemini model ${candidate} quota reached or unavailable. Trying fallback model...`);
          continue;
        }
        break;
      }
    }

    if (lastErr?.status === 429 || lastErr?.message?.includes('429') || lastErr?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Google Gemini API quota exceeded or rate limit reached. Please wait a moment or switch to local Ollama.');
    }
    if (lastErr?.status === 400 && lastErr?.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Google Gemini API key. Please check GEMINI_API_KEY in backend/.env.');
    }
    logger.error('Gemini generate error', lastErr);
    throw new Error(lastErr?.message || 'Gemini API call failed');
  }

  async chat({ messages, language }) {
    if (!this.apiKey || !this.client) {
      throw new Error('GEMINI_API_KEY is missing. Please configure it in your backend environment.');
    }

    const systemInstruction = `${BASE_SYSTEM_PROMPT}\nTarget programming language context: ${language || 'general'}`;
    const candidateModels = [
      this.modelName,
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1]?.content || 'Hello';
    let lastErr = null;

    for (const candidate of candidateModels) {
      try {
        const model = this.client.getGenerativeModel({
          model: candidate,
          systemInstruction,
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage);
        this.modelName = candidate;
        return {
          message: result.response.text(),
          provider: 'gemini',
          model: candidate,
        };
      } catch (err) {
        lastErr = err;
        if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 404) {
          logger.warn(`Gemini chat model ${candidate} quota reached. Trying fallback model...`);
          continue;
        }
        break;
      }
    }

    throw lastErr;
  }

  async explain({ code, language }) {
    const userPrompt = `Programming Language: ${language}\n\nStudent Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nExplain this code line-by-line and summarize it.`;
    const rawJson = await this._generate(EXPLAINER_PROMPT, userPrompt, { jsonMode: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'gemini',
      model: this.modelName,
    };
  }

  async debug({ code, language, errorMessage, expectedBehavior }) {
    const userPrompt = `Language: ${language}\n\nStudent Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nReported Error/Symptom: ${
      errorMessage || 'Not provided'
    }\nExpected Behavior: ${
      expectedBehavior || 'Not provided'
    }\n\nDiagnose the issue and provide a minimal fix.`;

    const rawJson = await this._generate(DEBUGGER_PROMPT, userPrompt, { jsonMode: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'gemini',
      model: this.modelName,
    };
  }

  async generatePractice({ language, difficulty, topic }) {
    const userPrompt = `Generate a ${difficulty} level practice problem for ${language} focused on the topic: "${topic}".`;
    const rawJson = await this._generate(PRACTICE_GENERATOR_PROMPT, userPrompt, { jsonMode: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      language,
      difficulty,
      topic,
      provider: 'gemini',
      model: this.modelName,
    };
  }

  async generateHint({ problem, level, currentCode }) {
    const hintSpec = HINT_LEVELS[level] || HINT_LEVELS[1];
    const systemInstruction = `${BASE_SYSTEM_PROMPT}\n\nYou are providing a Level ${level} (${hintSpec.name}) hint to a student.\nInstruction: ${hintSpec.instruction}\nDO NOT REVEAL COMPLETE CODE OR SOLUTION. Return JSON: { "hint": "hint text" }`;
    const userPrompt = `Problem: ${problem.title}\nDescription: ${problem.description}\nLanguage: ${problem.language}\nStudent's Current Attempt:\n\`\`\`${problem.language}\n${currentCode || 'No code written yet'}\n\`\`\`\n\nProvide the Level ${level} hint.`;

    const rawJson = await this._generate(systemInstruction, userPrompt, { jsonMode: true });
    const parsed = this.extractJson(rawJson);

    return {
      level,
      levelName: hintSpec.name,
      hint: parsed.hint || rawJson,
      provider: 'gemini',
      model: this.modelName,
    };
  }

  async generateSolution({ problem }) {
    const userPrompt = `Problem Title: ${problem.title}\nDescription: ${problem.description}\nLanguage: ${problem.language}\nConstraints: ${problem.constraints}\n\nProvide the complete pedagogical solution.`;
    const rawJson = await this._generate(SOLUTION_PROMPT, userPrompt, { jsonMode: true });
    const parsed = this.extractJson(rawJson);

    return {
      ...parsed,
      provider: 'gemini',
      model: this.modelName,
    };
  }
}

