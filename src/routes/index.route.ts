import { Router } from 'express';
import indexController from '@controllers/index.controller';

const router = Router();

router.get('/', indexController.index);

export default router;