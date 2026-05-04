import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.util';

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Access denied. User not authenticated.', undefined, 403);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied. Insufficient permissions.', undefined, 403);
    }

    next();
  };
};