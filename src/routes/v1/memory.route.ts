import { Router } from 'express';
import HealthController from '@controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/memory/profile:
 *   get:
 *     summary: Get memory profile
 *     description: Returns detailed memory usage statistics and profiling data
 *     tags: [Memory]
 *     responses:
 *       200:
 *         description: Memory profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 memoryUsage:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                       description: Resident Set Size in bytes
 *                     heapTotal:
 *                       type: number
 *                       description: Total heap memory in bytes
 *                     heapUsed:
 *                       type: number
 *                       description: Used heap memory in bytes
 *                     external:
 *                       type: number
 *                       description: External memory in bytes
 *                     arrayBuffers:
 *                       type: number
 *                       description: Array buffer memory in bytes
 *                 heapStatistics:
 *                   type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/profile', HealthController.memoryProfile);

/**
 * @swagger
 * /api/v1/memory/gc:
 *   post:
 *     summary: Force garbage collection
 *     description: Manually triggers garbage collection and returns memory statistics before and after
 *     tags: [Memory]
 *     responses:
 *       200:
 *         description: Garbage collection results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 before:
 *                   type: object
 *                   description: Memory usage before GC
 *                 after:
 *                   type: object
 *                   description: Memory usage after GC
 *                 memoryFreed:
 *                   type: number
 *                   description: Amount of memory freed in bytes
 *       500:
 *         description: Server error
 */
router.post('/gc', HealthController.forceGarbageCollection);

/**
 * @swagger
 * /api/v1/memory/baseline:
 *   post:
 *     summary: Create memory baseline
 *     description: Creates a memory usage baseline for comparison
 *     tags: [Memory]
 *     responses:
 *       200:
 *         description: Memory baseline created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 baseline:
 *                   type: object
 *                   description: Memory baseline data
 *       500:
 *         description: Server error
 */
router.post('/baseline', HealthController.createMemoryBaseline);

/**
 * @swagger
 * /api/v1/memory/heap-snapshot:
 *   post:
 *     summary: Generate heap snapshot
 *     description: Generates a heap snapshot for memory analysis
 *     tags: [Memory]
 *     responses:
 *       200:
 *         description: Heap snapshot generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 snapshotPath:
 *                   type: string
 *                   description: Path to the generated snapshot file
 *       500:
 *         description: Server error
 */
router.post('/heap-snapshot', HealthController.generateHeapSnapshot);

export default router;
