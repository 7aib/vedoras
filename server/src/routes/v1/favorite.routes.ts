import { Router } from 'express';
import {
  addFavoriteHandler,
  listFavoritesHandler,
  removeFavoriteHandler,
} from '../../controllers/favorite.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { favoriteParamsSchema, listFavoritesSchema } from '../../validators/favorite.validator.js';

const router = Router();

router.get(
  '/favorites',
  authenticate,
  validate(listFavoritesSchema, 'query'),
  listFavoritesHandler,
);
router.put(
  '/favorites/:listingId',
  authenticate,
  validate(favoriteParamsSchema, 'params'),
  addFavoriteHandler,
);
router.delete(
  '/favorites/:listingId',
  authenticate,
  validate(favoriteParamsSchema, 'params'),
  removeFavoriteHandler,
);

export default router;
