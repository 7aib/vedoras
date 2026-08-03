import { Router } from 'express';
import { listCategoriesHandler } from '../../controllers/category.controller.js';

const router = Router();

router.get('/categories', listCategoriesHandler);

export default router;
