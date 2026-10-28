import { Router } from 'express';
import { conversationsController } from '../controllers/conversationsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/requestValidator.js';
import {
  createConversationSchema,
  updateConversationSchema,
  conversationIdParamSchema,
} from '../validators/conversationsValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/', conversationsController.list);
router.post('/', validateRequest(createConversationSchema), conversationsController.create);
router.get('/:id', validateRequest(conversationIdParamSchema, 'params'), conversationsController.getById);
router.patch(
  '/:id',
  validateRequest(conversationIdParamSchema, 'params'),
  validateRequest(updateConversationSchema),
  conversationsController.update
);
router.delete('/:id', validateRequest(conversationIdParamSchema, 'params'), conversationsController.delete);

export default router;

