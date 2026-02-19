import prisma from '../config/database';
import { NotificationType } from '@prisma/client';
import logger from '../config/logger';

class NotificationService {
    /**
     * Create a new notification for a user.
     * This is designed to be called in a fire-and-forget pattern.
     */
    async createNotification(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        metadata?: Record<string, any>
    ) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                },
            });
            logger.debug(`Notification created for user ${userId}: ${title}`);
            return notification;
        } catch (error) {
            logger.error('Failed to create notification', error);
            throw error;
        }
    }

    /**
     * Get paginated notifications for a user.
     */
    async getNotifications(
        userId: string,
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ) {
        const where: any = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.notification.count({ where }),
        ]);

        return {
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Mark a single notification as read.
     */
    async markAsRead(notificationId: string, userId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user.
     */
    async markAllAsRead(userId: string) {
        const result = await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        return { count: result.count };
    }

    /**
     * Get count of unread notifications.
     */
    async getUnreadCount(userId: string): Promise<number> {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
}

const notificationService = new NotificationService();
export default notificationService;
