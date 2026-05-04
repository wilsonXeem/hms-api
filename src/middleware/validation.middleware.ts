import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors.util';
import { errorResponse } from '../utils/response.util';

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return errorResponse(res, 'Validation failed', undefined, 400);
      }
      next(new ValidationError('Invalid request data'));
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return errorResponse(res, 'Query validation failed', undefined, 400);
      }
      next(new ValidationError('Invalid query parameters'));
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return errorResponse(res, 'Parameter validation failed', undefined, 400);
      }
      next(new ValidationError('Invalid parameters'));
    }
  };
};

// Legacy middleware - keep for backward compatibility
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
};

export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json') && !req.is('multipart/form-data')) {
      return errorResponse(res, 'Content-Type must be application/json or multipart/form-data', undefined, 400);
    }
  }
  next();
};

const expressValidatorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', undefined, 400);
  }
  next();
};

export const validateRequest: any = (
  schemaOrReq: z.ZodSchema | Request,
  res?: Response,
  next?: NextFunction
) => {
  if (res && next) {
    return expressValidatorMiddleware(schemaOrReq as Request, res, next);
  }

  return validateBody(schemaOrReq as z.ZodSchema);
};

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Valid email is required'),
  phone: z.string().regex(/^[+]?[0-9\s-()]+$/, 'Invalid phone format').optional().or(z.literal('')),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message too long')
});

const publicBookingSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters').max(100, 'Patient name too long'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').regex(/^[+]?[0-9\s-()]+$/, 'Invalid phone format'),
  doctorId: z.string().uuid('Valid doctor ID is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').refine(date => {
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  }, 'Appointment date cannot be in the past'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').refine(time => {
    const validTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
    return validTimes.includes(time);
  }, 'Invalid appointment time slot'),
  reason: z.string().max(500, 'Reason too long').optional()
});

export const validateContactSubmission = validateBody(contactSchema);
export const validatePublicBooking = validateBody(publicBookingSchema);

// Backward compatibility for express-validator route arrays.
export const validationMiddleware = expressValidatorMiddleware;
