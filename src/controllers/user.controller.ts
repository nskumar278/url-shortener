import { Request, Response } from 'express';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import userService from '@services/user.service';
import { ApiResponse } from '@interfaces/api.interface';
import logger from '@configs/logger';

class UserController {
    public static createUser = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Create user endpoint accessed');

        const userData = req.body;
        const newUser = await userService.createUser(userData);
        
        const response: ApiResponse = {
            success: true,
            message: 'User created successfully',
            data: newUser,
            timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
    });

    public static getAllUsers = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Get all users endpoint accessed');

        const users = await userService.getAllUsers();
        
        const response: ApiResponse = {
            success: true,
            message: 'Users retrieved successfully',
            data: users,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });

    public static getUserById = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Get user by ID endpoint accessed');

        const userId = req.params.id;
        const user = await userService.getUserById(userId);
        
        const response: ApiResponse = {
            success: true,
            message: 'User retrieved successfully',
            data: user,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });

    public static updateUser = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Update user endpoint accessed');

        const userId = req.params.id;
        const updatedData = req.body;
        const updatedUser = await userService.updateUser(userId, updatedData);
        
        const response: ApiResponse = {
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });

    public static updateUserFull = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Full update user endpoint accessed');

        const userId = req.params.id;
        const userData = req.body;
        const updatedUser = await userService.updateUserFull(userId, userData);
        
        const response: ApiResponse = {
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });

    public static deleteUser = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        logger.info('Delete user endpoint accessed');

        const userId = req.params.id;
        await userService.deleteUser(userId);
        
        const response: ApiResponse = {
            success: true,
            message: 'User deleted successfully',
            data: null,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response); // Changed from 204 to 200 with response body
    });
}

export default UserController;