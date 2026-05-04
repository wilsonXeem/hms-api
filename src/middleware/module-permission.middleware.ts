import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db.config';
import { modulePermissions } from '../models/module-permissions.model';
import { eq, and } from 'drizzle-orm';

export const checkModulePermission = (moduleCode: string, permission: 'read' | 'write' | 'admin') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const hasPermission = await db.select()
        .from(modulePermissions)
        .where(and(
          eq(modulePermissions.userId, userId),
          eq(modulePermissions.permission, permission),
          eq(modulePermissions.granted, true)
        ))
        .limit(1);

      if (!hasPermission.length) {
        return res.status(403).json({ error: 'Module access denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};