import { Router } from 'express';
import UserController from '@controllers/user.controller';
import { userValidations } from '@middlewares/validations';

const router = Router();

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Register a new user in the system with email, name, and password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *           examples:
 *             example1:
 *               summary: Basic user creation
 *               value:
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 password: "SecurePassword123!"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User created successfully"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 createdAt: "2025-08-04T10:30:00.000Z"
 *                 updatedAt: "2025-08-04T10:30:00.000Z"
 *               timestamp: "2025-08-04T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
    '/',
    userValidations.registerUser,
    UserController.createUser
);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users in the system with pagination support
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *             example:
 *               success: true
 *               message: "Users retrieved successfully"
 *               data:
 *                 users:
 *                   - id: "123e4567-e89b-12d3-a456-426614174000"
 *                     name: "John Doe"
 *                     email: "john.doe@example.com"
 *                     createdAt: "2025-08-04T10:30:00.000Z"
 *                     updatedAt: "2025-08-04T10:30:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 1
 *                   totalPages: 1
 *               timestamp: "2025-08-04T10:30:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/',
    userValidations.listUsers,
    UserController.getAllUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their unique identifier
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique user identifier
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User retrieved successfully"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 createdAt: "2025-08-04T10:30:00.000Z"
 *                 updatedAt: "2025-08-04T10:30:00.000Z"
 *               timestamp: "2025-08-04T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/:id',
    userValidations.identifyUserById,
    UserController.getUserById
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user completely
 *     description: Update all fields of a user (full update/replacement)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique user identifier
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *           examples:
 *             example1:
 *               summary: Update user details
 *               value:
 *                 name: "John Doe Updated"
 *                 email: "john.updated@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "User updated successfully"
 *               data:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "John Doe Updated"
 *                 email: "john.updated@example.com"
 *                 createdAt: "2025-08-04T10:30:00.000Z"
 *                 updatedAt: "2025-08-04T10:31:00.000Z"
 *               timestamp: "2025-08-04T10:31:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
    '/:id',
    userValidations.identifyUserById,
    UserController.updateUserFull
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Permanently delete a user from the system
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique user identifier
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "User deleted successfully"
 *               data: null
 *               timestamp: "2025-08-04T10:32:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
    '/:id',
    userValidations.identifyUserById,
    UserController.deleteUser
);

export default router;
