import { Router } from 'express';
import indexController from '@controllers/index.controller';

const router = Router();

router.get('/', indexController.index);

// API Documentation
router.get('/docs', indexController.getDocs);

export default router;