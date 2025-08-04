import { Router } from 'express';
import UserController from '@controllers/user.controller';

const router = Router();

router.post('/users', UserController.createUser);
router.get('/users', UserController.getAllUsers);
router.get('/users/:id', UserController.getUserById);
router.patch('/users/:id', UserController.updateUser);
router.put('/users/:id', UserController.updateUserFull);
router.delete('/users/:id', UserController.deleteUser);

export default router;
