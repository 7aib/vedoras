import { Router } from 'express';
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from '../../controllers/notification.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  listNotificationsSchema,
  notificationParamsSchema,
} from '../../validators/notification.validator.js';

const router = Router();

router.get(
  '/notifications',
  authenticate,
  validate(listNotificationsSchema, 'query'),
  listNotificationsHandler,
);

router.put(
  '/notifications/:id/read',
  authenticate,
  validate(notificationParamsSchema, 'params'),
  markNotificationReadHandler,
);

router.put('/notifications/read-all', authenticate, markAllNotificationsReadHandler);

export default router;
