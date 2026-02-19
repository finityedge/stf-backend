import { Request, Response } from 'express';
import configService from '../services/config.service';
import logger from '../config/logger';

/**
 * @swagger
 * /api/config/current:
 *   get:
 *     tags: [Configuration]
 *     summary: Get current portal configuration
 *     description: Returns dynamic portal settings including academic year, application window status, and contact details. No authentication required.
 *     responses:
 *       200:
 *         description: Current portal configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     academicYear:
 *                       type: string
 *                       example: "2025/26"
 *                     applicationDeadline:
 *                       type: string
 *                       nullable: true
 *                     applicationWindowOpen:
 *                       type: boolean
 *                     foundationName:
 *                       type: string
 *                     contactEmail:
 *                       type: string
 *                     contactPhone:
 *                       type: string
 *                     maxFileSize:
 *                       type: number
 *                     allowedFileTypes:
 *                       type: array
 *                       items:
 *                         type: string
 */
export const getCurrentConfig = async (_req: Request, res: Response): Promise<void> => {
    try {
        const config = await configService.getCurrentConfig();

        res.status(200).json({
            success: true,
            data: config,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get portal configuration',
            timestamp: new Date().toISOString(),
        });
    }
};
