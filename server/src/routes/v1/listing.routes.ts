import { Router } from 'express';
import {
  createListingHandler,
  deleteListingHandler,
  getListingHandler,
  listListingsHandler,
  listMyListingsHandler,
  updateListingHandler,
} from '../../controllers/listing.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createListingSchema,
  listListingsSchema,
  listingParamsSchema,
  updateListingSchema,
} from '../../validators/listing.validator.js';

const router = Router();

router.get('/listings', validate(listListingsSchema, 'query'), listListingsHandler);
router.get(
  '/listings/mine',
  authenticate,
  validate(listListingsSchema, 'query'),
  listMyListingsHandler,
);
router.post('/listings', authenticate, validate(createListingSchema), createListingHandler);
router.get('/listings/:id', validate(listingParamsSchema, 'params'), getListingHandler);
router.patch(
  '/listings/:id',
  authenticate,
  validate(listingParamsSchema, 'params'),
  validate(updateListingSchema),
  updateListingHandler,
);
router.delete(
  '/listings/:id',
  authenticate,
  validate(listingParamsSchema, 'params'),
  deleteListingHandler,
);

export default router;
