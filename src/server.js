import { app } from './app.js';
import { config, validateConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { getActiveAIProvider } from './services/ai/aiService.js';

const diagnostics = validateConfig();
if (diagnostics.length > 0) {
  console.log('\n--- Configuration Diagnostics ---');
  diagnostics.forEach((d) => console.log(d));
  console.log('---------------------------------\n');
}

// Initialize provider singleton
try {
  getActiveAIProvider();
} catch (err) {
  logger.warn('Initial AI provider initialization warning', { error: err.message });
}

const server = app.listen(config.port, () => {
  logger.info(`🚀 CodeBuddy AI Backend listening on port ${config.port} (${config.nodeEnv})`);
  logger.info(`🤖 Active AI Provider: ${config.ai.provider.toUpperCase()} (Model: ${
    config.ai.provider === 'gemini' ? config.ai.gemini.model : config.ai.ollama.model
  })`);
  logger.info(`🌐 Allowed Frontend Origin: ${config.frontendOrigin}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

