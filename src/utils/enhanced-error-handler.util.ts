import { Request, Response, NextFunction } from 'express';
import { secureLog } from './secure-logger.util';
import { AppError } from './errors.util';

export interface ErrorContext {
  userId?: string;
  facilityId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
}

export class EnhancedErrorHandler {
  static async handleAsync(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static logError(error: Error, context: ErrorContext = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
      timestamp: new Date().toISOString()
    };

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        secureLog.error('Server Error', errorInfo);
      } else {
        secureLog.warn('Client Error', errorInfo);
      }
    } else {
      secureLog.error('Unexpected Error', errorInfo);
    }
  }

  static createErrorResponse(error: Error, req: Request) {
    const context: ErrorContext = {
      userId: req.user?.id,
      facilityId: req.facilityId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    this.logError(error, context);

    if (error instanceof AppError) {
      return {
        success: false,
        message: error.message,
        errorCode: error.errorCode,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };
    }

    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;

    return {
      success: false,
      message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    };
  }
}

// Wrapper for consistent async error handling
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Standardized error response
export const sendErrorResponse = (res: Response, error: Error, req: Request) => {
  const errorResponse = EnhancedErrorHandler.createErrorResponse(error, req);
  res.status(errorResponse.statusCode).json(errorResponse);
};