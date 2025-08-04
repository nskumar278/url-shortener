import { Router } from 'express';
import UserController from '@controllers/user.controller';
import { userValidations } from '@middlewares/validations';

const router = Router();

router.post(
    '/',
    userValidations.registerUser,
    UserController.createUser
);

router.get(
    '/',
    userValidations.listUsers,
    UserController.getAllUsers
);

router.get(
    '/:id',
    userValidations.identifyUserById,
    UserController.getUserById
);

router.put(
    '/:id',
    userValidations.identifyUserById,
    UserController.updateUserFull
);
router.delete(
    '/:id',
    userValidations.identifyUserById,
    UserController.deleteUser
);

export default router;
