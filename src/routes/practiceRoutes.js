import { Router } from 'express';
import { practiceController } from '../controllers/practiceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/requestValidator.js';
import {
  practiceIdParamSchema,
  submitAttemptSchema,
} from '../validators/practiceValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', practiceController.listProblems);
router.post('/', practiceController.createProblem);
router.get('/attempts', practiceController.listAttempts);
router.get('/:id', validateRequest(practiceIdParamSchema, 'params'), practiceController.getProblemById);
router.post(
  '/:id/attempts',
  validateRequest(practiceIdParamSchema, 'params'),
  validateRequest(submitAttemptSchema),
  practiceController.submitAttempt
);

export default router;

