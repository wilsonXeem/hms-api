import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sanitizeInput } from '../utils/sanitizer.util';
import { secureLog } from '../utils/secure-logger.util';

interface CSRFRequest extends Request {
  csrfToken?: string;
  session?: any;
}

// Enhanced CSRF protection middleware
export const csrfProtection = (req: CSRFRequest, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints with valid JWT (already authenticated)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const token = sanitizeInput(req.headers['x-csrf-token'] as string || req.body?._csrf);
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    secureLog.warn('CSRF token validation failed', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      path: req.path 
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = (req: CSRFRequest, res: Response, next: NextFunction) => {
  if (!req.session) {
    req.session = {};
  }
  
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  req.csrfToken = req.session.csrfToken;
  res.locals.csrfToken = req.session.csrfToken;
  
  next();
};

// Endpoint to get CSRF token
export const getCSRFToken = (req: CSRFRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      csrfToken: req.csrfToken
    }
  });
};