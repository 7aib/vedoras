import { Router } from 'express';
import { apiInfo } from '../../controllers/info.controller.js';
import { healthCheck, liveness, readiness } from '../../controllers/health.controller.js';
import authRoutes from './auth.routes.js';
import listingRoutes from './listing.routes.js';
import categoryRoutes from './category.routes.js';
import uploadRoutes from './upload.routes.js';
import favoriteRoutes from './favorite.routes.js';
import chatRoutes from './chat.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// --- API metadata ---
router.get('/', apiInfo);

// --- Health probes ---
router.get('/health', healthCheck);
router.get('/health/live', liveness);
router.get('/health/ready', readiness);

// --- Domain routes ---
router.use(authRoutes);
router.use(listingRoutes);
router.use(categoryRoutes);
router.use(uploadRoutes);
router.use(favoriteRoutes);
router.use(chatRoutes);
router.use(notificationRoutes);
router.use(adminRoutes);

export default router;
