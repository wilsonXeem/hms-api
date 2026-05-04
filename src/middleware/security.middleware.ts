import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { safeLogger } from '../utils/safe-logger.util';

// Enhanced rate limiting for different endpoints

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: 'Rate Limit Exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          // Remove potential XSS patterns
          sanitized[key] = value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// SQL injection prevention
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|")/g,
    /(\bOR\b|\bAND\b).*?[=<>]/gi
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const scanObject = (obj: any): boolean => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string' && checkForSQLInjection(value)) {
          return true;
        } else if (typeof value === 'object' && scanObject(value)) {
          return true;
        }
      }
    }
    return false;
  };

  if (req.body && scanObject(req.body)) {
    safeLogger.warn('Potential SQL injection attempt from IP', req.ip);
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected',
      error: 'Bad Request'
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    safeLogger.warn('Request size exceeded limit', `${contentLength} bytes from IP: ${req.ip}`);
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      error: 'Payload Too Large'
    });
  }

  next();
};

// IP whitelist middleware (for admin routes)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
      safeLogger.warn('Unauthorized IP access attempt', clientIP);
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address',
        error: 'Forbidden'
      });
    }
    
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};