import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/requestValidator.js';
import {
  explainCodeSchema,
  debugCodeSchema,
  practiceGenerateSchema,
  hintRequestSchema,
  solutionRequestSchema,
  chatMessageSchema,
} from '../validators/aiValidators.js';

const router = Router();

// Public AI health check & dynamic switching
router.get('/health', aiController.health);
router.post('/switch', aiController.switchProvider);

// AI Tutoring & Generation Endpoints (protected & rate-limited)
router.post(
  '/explain',
  aiLimiter,
  requireAuth,
  validateRequest(explainCodeSchema),
  aiController.explain
);

router.post(
  '/debug',
  aiLimiter,
  requireAuth,
  validateRequest(debugCodeSchema),
  aiController.debug
);

router.post(
  '/practice/generate',
  aiLimiter,
  requireAuth,
  validateRequest(practiceGenerateSchema),
  aiController.generatePractice
);

router.post(
  '/hints',
  aiLimiter,
  requireAuth,
  validateRequest(hintRequestSchema),
  aiController.getHint
);

router.post(
  '/solution',
  aiLimiter,
  requireAuth,
  validateRequest(solutionRequestSchema),
  aiController.getSolution
);

router.post(
  '/chat',
  aiLimiter,
  requireAuth,
  validateRequest(chatMessageSchema),
  aiController.chat
);

export default router;

