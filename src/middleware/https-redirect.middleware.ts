import { Request, Response, NextFunction } from 'express';

// HTTPS redirect middleware for production
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// Strict Transport Security header
export const hstsHeader = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
};