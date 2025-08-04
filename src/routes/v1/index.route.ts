import { Router } from 'express';
import IndexController from '@controllers/index.controller';
import DocsController from '@controllers/docs.controller';

const router = Router();

router.get('/', IndexController.index);

// API Documentation
router.get('/docs', DocsController.getApiDocs);

export default router;