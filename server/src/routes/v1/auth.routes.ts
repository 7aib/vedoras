import { Router } from 'express';
import { register, login, logout, refresh, me } from '../../controllers/auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { loginSchema, registerSchema } from '../../validators/auth.validator.js';
import { env } from '../../config/env.js';

const router = Router();

// Stricter limits on credential endpoints to blunt brute-force attacks.
const authLimiter = createRateLimiter({ limit: env.AUTH_RATE_LIMIT_MAX });

router.post('/auth/register', authLimiter, validate(registerSchema), register);
router.post('/auth/login', authLimiter, validate(loginSchema), login);
router.post('/auth/refresh', refresh);
router.post('/auth/logout', logout);
router.get('/auth/me', authenticate, me);

export default router;
