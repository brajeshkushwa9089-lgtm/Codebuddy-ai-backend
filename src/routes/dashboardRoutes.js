import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/activity', dashboardController.getActivity);

export default router;

