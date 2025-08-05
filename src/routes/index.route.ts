import { Router } from 'express';
import IndexController from '@controllers/index.controller';
import HealthController from '@controllers/health.controller';

const router = Router();

router.get('/', IndexController.index);

// Health check endpoint
router.get('/health', HealthController.healthCheck);

export default router;