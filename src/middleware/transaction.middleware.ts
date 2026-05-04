import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export const withTransaction = (handler: (req: Request, res: Response, tx: any) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db.transaction(async (tx) => {
        await handler(req, res, tx);
      });
    } catch (error) {
      next(error);
    }
  };
};