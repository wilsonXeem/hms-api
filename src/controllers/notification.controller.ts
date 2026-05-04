import { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { notifications } from '../models/notifications.model';
import { NotificationService } from '../services/notification.service';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    
    if (unreadOnly === 'true') {
      query = query.where(eq(notifications.isRead, false));
    }

    const userNotifications = await query.limit(Number(limit));
    
    successResponse(res, 'Notifications retrieved successfully', { notifications: userNotifications });
  } catch (error) {
    logger.error('Get notifications error:', error);
    next(error);
  }
};

export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const updated = await NotificationService.markAsRead(id, userId);
    
    if (!updated) {
      return errorResponse(res, 'Notification not found', undefined, 404);
    }

    successResponse(res, 'Notification marked as read', { notification: updated });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    successResponse(res, 'All notifications marked as read');
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    next(error);
  }
};

export const getNotificationStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const stats = await db.select({
      total: sql<number>`COUNT(*)`,
      unread: sql<number>`COUNT(CASE WHEN ${notifications.isRead} = false THEN 1 END)`,
      high_priority: sql<number>`COUNT(CASE WHEN ${notifications.priority} = 'high' AND ${notifications.isRead} = false THEN 1 END)`
    })
    .from(notifications)
    .where(eq(notifications.userId, userId));

    successResponse(res, 'Notification stats retrieved', { stats: stats[0] });
  } catch (error) {
    logger.error('Get notification stats error:', error);
    next(error);
  }
};