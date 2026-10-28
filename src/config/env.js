import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'ollama').toLowerCase().trim(),
    timeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS, 10) || 60000,
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      model: process.env.OLLAMA_MODEL || 'gemma3:1b',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    },
  },
};

/**
 * Validates critical configuration on startup and prints beginner-friendly diagnostic logs.
 */
export function validateConfig() {
  const diagnostics = [];

  if (!config.supabase.url || config.supabase.url.includes('your-project') || config.supabase.url.includes('placeholder')) {
    diagnostics.push('⚠️  SUPABASE_URL is not configured with a live project URL.');
  } else {
    diagnostics.push(`✅  Supabase connected: ${config.supabase.url}`);
  }

  if (!config.supabase.publishableKey || config.supabase.publishableKey.includes('placeholder')) {
    diagnostics.push('⚠️  SUPABASE_PUBLISHABLE_KEY is missing or set to placeholder.');
  }

  if (config.ai.provider === 'ollama') {
    if (!config.ai.ollama.baseUrl) {
      diagnostics.push('⚠️  OLLAMA_BASE_URL is empty; defaulting to http://127.0.0.1:11434');
    }
  } else if (config.ai.provider === 'gemini') {
    if (!config.ai.gemini.apiKey) {
      diagnostics.push('⚠️  GEMINI_API_KEY is empty. Requests using Gemini will fail until an API key is provided.');
    }
  } else {
    diagnostics.push(`⚠️  Unknown AI_PROVIDER '${config.ai.provider}'. Expected 'ollama' or 'gemini'.`);
  }

  return diagnostics;
}
