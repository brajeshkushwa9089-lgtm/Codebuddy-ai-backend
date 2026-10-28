import { aiService } from '../services/ai/aiService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../../src/utils/logger.js';

export const aiController = {
  async health(req, res) {
    try {
      const health = await aiService.healthCheck();
      const statusCode = health.status === 'connected' ? 200 : 503;
      return res.status(statusCode).json(health);
    } catch (err) {
      return res.status(503).json({
        status: 'error',
        error: err.message || 'AI health check probe failed',
      });
    }
  },

  async explain(req, res, next) {
    try {
      const { code, language } = req.body;
      const result = await aiService.explainCode({
        code,
        language,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async debug(req, res, next) {
    try {
      const { code, language, errorMessage, expectedBehavior } = req.body;
      const result = await aiService.debugCode({
        code,
        language,
        errorMessage,
        expectedBehavior,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async generatePractice(req, res, next) {
    try {
      const { language, difficulty, topic } = req.body;
      const result = await aiService.generatePracticeProblem({
        language,
        difficulty,
        topic,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  async getHint(req, res, next) {
    try {
      const { problemId, level, currentCode } = req.body;
      const result = await aiService.getHint({
        problemId,
        level,
        currentCode,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getSolution(req, res, next) {
    try {
      const { problemId, confirmRequest } = req.body;
      if (!confirmRequest) {
        return errorResponse(res, 'Explicit confirmation required to view solution', 400);
      }
      const result = await aiService.getSolution({
        problemId,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },

  async chat(req, res, next) {
    try {
      const { conversationId, message, language } = req.body;
      const result = await aiService.chat({
        conversationId,
        message,
        language,
        user: req.user,
        supabase: req.supabase,
      });
      return successResponse(res, result);
    } catch (err) {
      next(err);
    }
  },
};

