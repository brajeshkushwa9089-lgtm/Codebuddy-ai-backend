import { config } from '../../config/env.js';
import { OllamaProvider } from './ollamaProvider.js';
import { GeminiProvider } from './geminiProvider.js';
import { logger } from '../../utils/logger.js';

let ollamaInstance = null;
let geminiInstance = null;
let activeProviderOverride = null;
let currentProviderType = (config.ai.provider || 'gemini').toLowerCase().trim();

function getOllamaInstance() {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaProvider(config.ai);
  }
  return ollamaInstance;
}

function getGeminiInstance() {
  if (!geminiInstance) {
    geminiInstance = new GeminiProvider(config.ai);
  }
  return geminiInstance;
}

/**
 * Initializes and returns the active AI provider singleton according to configuration or override.
 */
export function getActiveAIProvider() {
  if (activeProviderOverride) return activeProviderOverride;

  if (currentProviderType === 'ollama') {
    return getOllamaInstance();
  }
  return getGeminiInstance();
}

/**
 * Switch active provider on the fly ('ollama' or 'gemini')
 */
export function switchActiveProvider(providerName) {
  const norm = (providerName || '').toLowerCase().trim();
  if (norm === 'ollama' || norm === 'gemini') {
    currentProviderType = norm;
    logger.info(`Switched active AI Provider to '${norm}'`);
    return true;
  }
  return false;
}

/**
 * For testing purposes: allows injecting a custom or mock AI provider.
 */
export function setActiveAIProvider(provider) {
  activeProviderOverride = provider;
}

/**
 * Unified execution wrapper that provides automatic failover between Ollama and Gemini.
 * If offline or daemon unreachable, it seamlessly routes to the alternative provider.
 */
async function executeWithFallback(actionName, actionFn) {
  const primary = getActiveAIProvider();
  try {
    return await actionFn(primary);
  } catch (err) {
    logger.warn(`Primary AI provider '${primary.name}' failed during ${actionName}: ${err.message}. Checking backup...`);

    // Determine backup provider
    const backup = primary.name === 'gemini' ? getOllamaInstance() : getGeminiInstance();
    try {
      const backupResult = await actionFn(backup);
      logger.info(`Failover to backup AI provider '${backup.name}' succeeded for ${actionName}`);
      return backupResult;
    } catch (backupErr) {
      logger.error(`Backup AI provider '${backup.name}' also failed: ${backupErr.message}`);
      throw err;
    }
  }
}

/**
 * Record student learning activity in Supabase learning_activity table
 */
export async function logActivity(supabase, { userId, activityType, language, topic, metadata = {} }) {
  if (!supabase || !userId) return;
  try {
    await supabase.from('learning_activity').insert({
      user_id: userId,
      activity_type: activityType,
      language: language || 'general',
      topic: topic || null,
      metadata,
    });
  } catch (err) {
    // Non-blocking log failure
    logger.warn('Failed to record learning_activity log in database', { error: err.message });
  }
}

/**
 * Service facade methods providing unified AI actions and activity logging
 */
export const aiService = {
  async healthCheck() {
    const primary = getActiveAIProvider();
    const primaryHealth = await primary.healthCheck();

    if (primaryHealth.status === 'connected') {
      return {
        ...primaryHealth,
        activeProvider: primary.name,
        availableProviders: ['gemini', 'ollama'],
      };
    }

    // Try probing backup provider
    const backup = primary.name === 'gemini' ? getOllamaInstance() : getGeminiInstance();
    try {
      const backupHealth = await backup.healthCheck();
      if (backupHealth.status === 'connected') {
        return {
          ...backupHealth,
          activeProvider: backup.name,
          failoverActive: true,
          notice: `Primary provider (${primary.name}) unavailable; automatically routed to ${backup.name}.`,
          availableProviders: ['gemini', 'ollama'],
        };
      }
    } catch (e) {
      // Ignore backup error and return primary
    }

    return {
      ...primaryHealth,
      activeProvider: primary.name,
      availableProviders: ['gemini', 'ollama'],
    };
  },

  async explainCode({ code, language, user, supabase }) {
    const explanation = await executeWithFallback('explainCode', (provider) =>
      provider.explain({ code, language })
    );

    if (user && supabase) {
      await logActivity(supabase, {
        userId: user.id,
        activityType: 'code_explanation',
        language,
        metadata: {
          codeLength: code.length,
          concepts: explanation.concepts || [],
        },
      });
    }

    return explanation;
  },

  async debugCode({ code, language, errorMessage, expectedBehavior, user, supabase }) {
    const debugResult = await executeWithFallback('debugCode', (provider) =>
      provider.debug({
        code,
        language,
        errorMessage,
        expectedBehavior,
      })
    );

    if (user && supabase) {
      await logActivity(supabase, {
        userId: user.id,
        activityType: 'error_debug',
        language,
        metadata: {
          hasErrorMsg: Boolean(errorMessage),
          isSyntax: debugResult.isDefiniteSyntaxError,
        },
      });
    }

    return debugResult;
  },

  async generatePracticeProblem({ language, difficulty, topic, user, supabase }) {
    const problemData = await executeWithFallback('generatePracticeProblem', (provider) =>
      provider.generatePractice({ language, difficulty, topic })
    );

    // If user and supabase client provided, persist into practice_problems
    let savedProblem = null;
    if (user && supabase) {
      const { data, error } = await supabase
        .from('practice_problems')
        .insert({
          user_id: user.id,
          language,
          topic,
          difficulty,
          title: problemData.title,
          description: problemData.description,
          input_description: problemData.inputDescription || '',
          output_description: problemData.outputDescription || '',
          constraints: problemData.constraints || '',
          sample_input: problemData.sampleInput || '',
          sample_output: problemData.sampleOutput || '',
        })
        .select()
        .single();

      if (!error && data) {
        savedProblem = data;
      }

      await logActivity(supabase, {
        userId: user.id,
        activityType: 'problem_generated',
        language,
        topic,
        metadata: { difficulty, problemId: savedProblem?.id },
      });
    }

    return {
      ...(savedProblem || problemData),
      conceptPracticed: problemData.conceptPracticed,
      provider: problemData.provider,
      model: problemData.model,
    };
  },

  async getHint({ problemId, level, currentCode, user, supabase }) {
    // Fetch problem details to ground hint accurately
    let problem = { title: 'Practice Problem', description: 'Problem context', language: 'python' };
    if (supabase) {
      const { data } = await supabase
        .from('practice_problems')
        .select('*')
        .eq('id', problemId)
        .single();
      if (data) problem = data;
    }

    const hintData = await executeWithFallback('getHint', (provider) =>
      provider.generateHint({ problem, level, currentCode })
    );

    // Track attempt hint usage in practice_attempts
    if (user && supabase) {
      const { data: existingAttempt } = await supabase
        .from('practice_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('problem_id', problemId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingAttempt) {
        await supabase
          .from('practice_attempts')
          .update({
            hints_used: Math.max(existingAttempt.hints_used, level),
            submitted_code: currentCode || existingAttempt.submitted_code,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAttempt.id);
      } else {
        await supabase.from('practice_attempts').insert({
          user_id: user.id,
          problem_id: problemId,
          submitted_code: currentCode || '',
          hints_used: level,
          completed: false,
        });
      }

      await logActivity(supabase, {
        userId: user.id,
        activityType: 'hint_requested',
        language: problem.language,
        topic: problem.topic,
        metadata: { problemId, level },
      });
    }

    return hintData;
  },

  async getSolution({ problemId, user, supabase }) {
    let problem = { title: 'Practice Problem', description: 'Problem context', language: 'python' };
    if (supabase) {
      const { data } = await supabase
        .from('practice_problems')
        .select('*')
        .eq('id', problemId)
        .single();
      if (data) problem = data;
    }

    const solutionData = await executeWithFallback('getSolution', (provider) =>
      provider.generateSolution({ problem })
    );

    if (user && supabase) {
      await logActivity(supabase, {
        userId: user.id,
        activityType: 'solution_viewed',
        language: problem.language,
        topic: problem.topic,
        metadata: { problemId },
      });
    }

    return solutionData;
  },

  async chat({ conversationId, message, language, user, supabase }) {
    let messages = [{ role: 'user', content: message }];

    if (conversationId && supabase) {
      const { data: history } = await supabase
        .from('conversation_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);

      if (history && history.length > 0) {
        messages = [...history, { role: 'user', content: message }];
      }

      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      });
    }

    const response = await executeWithFallback('chat', (provider) =>
      provider.chat({ messages, language })
    );

    if (conversationId && supabase) {
      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.message,
      });

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      await logActivity(supabase, {
        userId: user.id,
        activityType: 'chat_message',
        language: language || 'general',
        metadata: { conversationId },
      });
    }

    return response;
  },
};
