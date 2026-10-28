import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/requestValidator.js';
import { updateProfileSchema } from '../validators/profileValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', profileController.getProfile);
router.patch('/', validateRequest(updateProfileSchema), profileController.updateProfile);

export default router;

