import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import logger from '../config/logger';

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications for the authenticated user
 *     description: Returns a paginated list of notifications. Optionally filter to unread only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: If true, only return unread notifications
 *     responses:
 *       200:
 *         description: Paginated list of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [STATUS_CHANGE, DEADLINE_REMINDER, APPLICATION_RECEIVED, WELCOME, GENERAL]
 *                       title:
 *                         type: string
 *                       message:
 *                         type: string
 *                       isRead:
 *                         type: boolean
 *                       metadata:
 *                         type: object
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const unreadOnly = req.query.unreadOnly === 'true';

        const result = await notificationService.getNotifications(userId, page, limit, unreadOnly);

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     description: Returns the count of unread notifications for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
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
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const count = await notificationService.getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: { unreadCount: count },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     isRead:
 *                       type: boolean
 *       404:
 *         description: Notification not found
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const notificationId = req.params.id as string;
        const notification = await notificationService.markAsRead(notificationId, userId);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Mark as read error:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        res.status(status).json({
            success: false,
            error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR', message: error.message },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications for the authenticated user as read.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "3 notifications marked as read"
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       description: Number of notifications that were marked as read
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const result = await notificationService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: `${result.count} notifications marked as read`,
            data: result,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message },
            timestamp: new Date().toISOString(),
        });
    }
};
