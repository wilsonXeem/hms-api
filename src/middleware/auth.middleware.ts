import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { errorResponse } from '../utils/response.util';
import { db } from '../config/db.config';
import { users } from '../models/users.model';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        email?: string;
        role: string;
        facilityId?: string;
      };
      queryHints?: Record<string, unknown>;
      userId?: string;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return errorResponse(res, 'Access token required', undefined, 401);
  }

  try {
    const decoded = verifyToken(token) as any;
    
    // Attach facilityId from the user record if not in token
    if (!decoded.facilityId) {
      const [user] = await db.select({ facilityId: users.facilityId })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);
      if (user?.facilityId) decoded.facilityId = user.facilityId;
    }

    req.user = decoded;
    req.userId = decoded.id;
    if (decoded.facilityId) req.facilityId = decoded.facilityId;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', undefined, 403);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(res, 'Insufficient permissions', undefined, 403);
    }
    next();
  };
};

// Alias for backward compatibility
export const authMiddleware = authenticateToken;
export const authenticate = authenticateToken;
