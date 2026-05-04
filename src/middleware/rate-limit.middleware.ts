import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.util';
import { RATE_LIMIT_CONFIG } from '../config/rate-limit.config';

// In-memory store for user-based rate limiting
const userRequestStore = new Map<string, { count: number; resetTime: number }>();

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  skipSuccessfulRequests: true,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later'
  },
});

export const publicContactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 contact submissions per hour
  message: {
    success: false,
    message: 'Too many contact form submissions, please try again later'
  },
});

export const publicBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 booking attempts per hour
  message: {
    success: false,
    message: 'Too many booking attempts, please try again later'
  },
});

export const publicInfoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 info requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
});

// User/Role-based rate limiter
export const userRoleLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(); // Skip if no user (will be handled by auth middleware)
  }

  const userId = req.user.id;
  const userRole = req.user.role;
  const now = Date.now();
  const { windowMs, roleLimits, includeHeaders } = RATE_LIMIT_CONFIG;
  const maxRequests = roleLimits[userRole as keyof typeof roleLimits] || roleLimits.default;

  // Get or create user request data
  let userData = userRequestStore.get(userId);
  
  if (!userData || now > userData.resetTime) {
    userData = { count: 0, resetTime: now + windowMs };
    userRequestStore.set(userId, userData);
  }

  userData.count++;

  if (userData.count > maxRequests) {
    const resetTimeSeconds = Math.ceil((userData.resetTime - now) / 1000);
    return errorResponse(res, `Rate limit exceeded for ${userRole}. Try again in ${resetTimeSeconds} seconds.`, undefined, 429);
  }

  // Set rate limit headers
  if (includeHeaders) {
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - userData.count).toString(),
      'X-RateLimit-Reset': new Date(userData.resetTime).toISOString()
    });
  }

  next();
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, userData] of userRequestStore.entries()) {
    if (now > userData.resetTime) {
      userRequestStore.delete(userId);
    }
  }
}, RATE_LIMIT_CONFIG.cleanupInterval);