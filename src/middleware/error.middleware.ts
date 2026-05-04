import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/app.config';
import { AppError, handleDatabaseError } from '../utils/errors.util';
import { monitoringService, CRITICAL_ERRORS } from '../services/monitoring.service';
import { EnhancedErrorHandler } from '../utils/enhanced-error-handler.util';
import { consistentLogger, LogCategory } from '../utils/consistent-logging.util';

export const errorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    appError = new AppError(`Validation failed: ${validationErrors}`, 400);
  } else if (error.code && error.code.startsWith('23')) {
    appError = handleDatabaseError(error);
  } else {
    appError = new AppError(error.message || 'Internal Server Error', error.statusCode || 500);
  }

  consistentLogger.error(appError.message, {
    statusCode: appError.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    facilityId: req.facilityId,
    category: LogCategory.SYSTEM
  });

  // Track critical errors for monitoring
  if (appError.statusCode >= 500) {
    monitoringService.trackError('server_error', appError);
  }
  
  // Track specific error types
  if (error.name === 'PharmacySafetyError') {
    monitoringService.trackError(CRITICAL_ERRORS.PHARMACY_SAFETY, error);
  } else if (error.name === 'LabValidationError') {
    monitoringService.trackError(CRITICAL_ERRORS.LAB_VALIDATION, error);
  } else if (error.name === 'InventoryConstraintError') {
    monitoringService.trackError(CRITICAL_ERRORS.INVENTORY_CONSTRAINT, error);
  } else if (error.code?.startsWith('23') || error.code?.startsWith('08')) {
    monitoringService.trackError(CRITICAL_ERRORS.DATABASE_CONNECTION, error);
  }

  const response = EnhancedErrorHandler.createErrorResponse(appError, req);
  
  // Add development-specific details
  if (config.nodeEnv === 'development' && !appError.isOperational) {
    (response as any).stack = appError.stack;
  }

  if ((error as any).warnings) {
    (response as any).warnings = (error as any).warnings;
  }

  res.status(appError.statusCode).json(response);
};

export { AppError };