import { Router } from 'express';
import {
  createConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  markReadHandler,
  sendMessageHandler,
} from '../../controllers/chat.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  conversationParamsSchema,
  createConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
  sendMessageSchema,
} from '../../validators/chat.validator.js';

const router = Router();

router.get(
  '/conversations',
  authenticate,
  validate(listConversationsSchema, 'query'),
  listConversationsHandler,
);

router.post(
  '/conversations',
  authenticate,
  validate(createConversationSchema, 'body'),
  createConversationHandler,
);

router.get(
  '/conversations/:id/messages',
  authenticate,
  validate(conversationParamsSchema, 'params'),
  validate(listMessagesSchema, 'query'),
  listMessagesHandler,
);

router.post(
  '/conversations/:id/messages',
  authenticate,
  validate(conversationParamsSchema, 'params'),
  validate(sendMessageSchema, 'body'),
  sendMessageHandler,
);

router.put(
  '/conversations/:id/read',
  authenticate,
  validate(conversationParamsSchema, 'params'),
  markReadHandler,
);

export default router;
