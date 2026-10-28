import { Router } from 'express';
import authRoutes from './authRoutes.js';
import aiRoutes from './aiRoutes.js';
import conversationsRoutes from './conversationsRoutes.js';
import practiceRoutes from './practiceRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import profileRoutes from './profileRoutes.js';

const router = Router();

// Base System Health
router.get('/health', (req, res) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Direct alias for /api/health/ai
import { aiController } from '../controllers/aiController.js';
router.get('/health/ai', aiController.health);

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/practice', practiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);

export default router;

