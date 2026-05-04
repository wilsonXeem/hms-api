import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { activityLogs } from '../models/activity-logs.model';

export const auditLogger = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode < 400) {
        db.insert(activityLogs).values({
          userId: req.user?.id,
          module: req.route?.path?.split('/')[1] || 'unknown',
          action,
          details: JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            resourceId: req.params.id,
            body: req.body,
            ip: req.ip
          })
        }).catch(console.error);
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};
