import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sanitizeInput } from '../utils/input-sanitizer.util';
import { secureLog } from '../utils/secure-logger.util';

interface CSRFRequest extends Request {
  csrfToken?: string;
}

// Enhanced CSRF protection with double-submit cookie pattern
export const enhancedCSRFProtection = (req: CSRFRequest, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints with valid JWT (stateless authentication)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  const headerToken = sanitizeInput.text(req.headers['x-csrf-token'] as string || '');
  const bodyToken = sanitizeInput.text(req.body._csrf || '');
  const cookieToken = sanitizeInput.text(req.cookies?.csrfToken || '');

  const token = headerToken || bodyToken;

  // Validate CSRF token using double-submit cookie pattern
  if (!token || !cookieToken || token !== cookieToken) {
    secureLog.warn('CSRF token validation failed', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      path: req.path,
      hasHeaderToken: !!headerToken,
      hasBodyToken: !!bodyToken,
      hasCookieToken: !!cookieToken
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      errorCode: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};

// Generate and set CSRF token
export const setCSRFToken = (req: CSRFRequest, res: Response, next: NextFunction) => {
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set as HTTP-only cookie for double-submit pattern
  res.cookie('csrfToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  req.csrfToken = token;
  res.locals.csrfToken = token;
  
  next();
};

// Endpoint to get CSRF token for client-side use
export const getCSRFToken = (req: CSRFRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      csrfToken: req.csrfToken
    }
  });
};