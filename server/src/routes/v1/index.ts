import { Router } from 'express';
import { apiInfo } from '../../controllers/info.controller.js';
import { healthCheck, liveness, readiness } from '../../controllers/health.controller.js';

const router = Router();

// --- API metadata ---
router.get('/', apiInfo);

// --- Health probes ---
router.get('/health', healthCheck);
router.get('/health/live', liveness);
router.get('/health/ready', readiness);

export default router;
