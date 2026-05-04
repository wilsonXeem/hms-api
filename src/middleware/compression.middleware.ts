import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// Smart compression middleware
export const compressionMiddleware = compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Compress JSON, text, and HTML responses
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      return /json|text|html|javascript|css/.test(contentType);
    }
    
    return compression.filter(req, res);
  }
});

// Response optimization middleware
export const responseOptimization = (req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for static content
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
  
  // Enable HTTP/2 server push hints
  res.setHeader('Link', '</api/health>; rel=preload; as=fetch');
  
  // Optimize JSON responses
  const originalJson = res.json;
  res.json = function(data: any) {
    // Remove null/undefined values to reduce payload size
    const optimizedData = removeEmptyValues(data);
    return originalJson.call(this, optimizedData);
  };
  
  next();
};

function removeEmptyValues(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeEmptyValues).filter(item => item !== null && item !== undefined);
  }
  
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = removeEmptyValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}