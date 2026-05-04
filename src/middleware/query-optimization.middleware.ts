import { Request, Response, NextFunction } from 'express';

export const queryOptimization = (req: Request, res: Response, next: NextFunction) => {
  // Add default pagination limits
  if (req.query.limit && parseInt(req.query.limit as string) > 100) {
    req.query.limit = '100';
  }
  if (!req.query.limit) {
    req.query.limit = '50';
  }
  if (!req.query.offset) {
    req.query.offset = '0';
  }

  // Add query hints for complex operations
  req.queryHints = {
    useIndex: true,
    batchSize: 1000,
    timeout: 30000
  };

  next();
};

export const batchOperations = (batchSize = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && Array.isArray(req.body) && req.body.length > batchSize) {
      return res.status(400).json({
        error: `Batch size cannot exceed ${batchSize} items`
      });
    }
    next();
  };
};