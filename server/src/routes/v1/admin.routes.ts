import { Router } from 'express';
import {
  getAdminStatsHandler,
  listAdminListingsHandler,
  listAdminUsersHandler,
  removeListingHandler,
  updateListingStatusHandler,
  updateUserRoleHandler,
} from '../../controllers/admin.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { validate } from '../../middleware/validate.js';
import {
  adminListingsQuerySchema,
  adminParamsSchema,
  adminUsersQuerySchema,
  updateListingStatusSchema,
  updateUserRoleSchema,
} from '../../validators/admin.validator.js';

const router = Router();

router.use('/admin', authenticate, requireAdmin);

router.get('/admin/stats', getAdminStatsHandler);
router.get('/admin/users', validate(adminUsersQuerySchema, 'query'), listAdminUsersHandler);
router.patch(
  '/admin/users/:id/role',
  validate(adminParamsSchema, 'params'),
  validate(updateUserRoleSchema),
  updateUserRoleHandler,
);
router.get(
  '/admin/listings',
  validate(adminListingsQuerySchema, 'query'),
  listAdminListingsHandler,
);
router.patch(
  '/admin/listings/:id/status',
  validate(adminParamsSchema, 'params'),
  validate(updateListingStatusSchema),
  updateListingStatusHandler,
);
router.delete('/admin/listings/:id', validate(adminParamsSchema, 'params'), removeListingHandler);

export default router;
