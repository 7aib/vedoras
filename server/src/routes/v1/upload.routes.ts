import { Router } from 'express';
import { deleteImageHandler, uploadImagesHandler } from '../../controllers/upload.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { uploadImages } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { env } from '../../config/env.js';
import { deleteImageSchema } from '../../validators/upload.validator.js';

const router = Router();

router.post(
  '/uploads/images',
  authenticate,
  uploadImages.array('images', env.UPLOAD_MAX_FILES),
  uploadImagesHandler,
);
router.delete('/uploads/images', authenticate, validate(deleteImageSchema), deleteImageHandler);

export default router;
