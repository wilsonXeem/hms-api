import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../utils/input-sanitizer.util';
import { secureLogger } from '../utils/secure-logger.util';

// Comprehensive input validation and sanitization middleware
export const inputValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    // Validate content length
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
    }

    next();
  } catch (error) {
    secureLogger.error('Input validation error', { error: error.message });
    return res.status(400).json({
      success: false,
      message: 'Invalid input data'
    });
  }
};

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeInput.html(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names
      const sanitizedKey = sanitizeInput.text(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// SQL injection prevention middleware
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|"|`)/,
      /(\bOR\b|\bAND\b).*[=<>]/i,
      /\b(WAITFOR|DELAY)\b/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQLInjection(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkObject(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkObject(value));
    }
    
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    secureLogger.warn('Potential SQL injection attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};