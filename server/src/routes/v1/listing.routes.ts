import { Router } from 'express';
import {
  createListingHandler,
  deleteListingHandler,
  getListingHandler,
  getRelatedListingsHandler,
  listListingsHandler,
  listMyListingsHandler,
  updateListingHandler,
} from '../../controllers/listing.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate.js';
import {
  createListingSchema,
  listListingsSchema,
  listingParamsSchema,
  relatedListingsSchema,
  updateListingSchema,
} from '../../validators/listing.validator.js';

const router = Router();

router.get(
  '/listings',
  optionalAuthenticate,
  validate(listListingsSchema, 'query'),
  listListingsHandler,
);
router.get(
  '/listings/mine',
  authenticate,
  validate(listListingsSchema, 'query'),
  listMyListingsHandler,
);
router.post('/listings', authenticate, validate(createListingSchema), createListingHandler);
router.get(
  '/listings/:id/related',
  optionalAuthenticate,
  validate(listingParamsSchema, 'params'),
  validate(relatedListingsSchema, 'query'),
  getRelatedListingsHandler,
);
router.get(
  '/listings/:id',
  optionalAuthenticate,
  validate(listingParamsSchema, 'params'),
  getListingHandler,
);
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
