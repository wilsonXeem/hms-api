export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;
  public details?: any;

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      errorCode: this.errorCode,
      details: this.details
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND', { resource });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

export class InsufficientStockError extends AppError {
  constructor(item: string, available: number, requested: number) {
    super(`Insufficient stock for ${item}. Available: ${available}, Requested: ${requested}`, 400, 'INSUFFICIENT_STOCK', { item, available, requested });
  }
}

export class SafetyError extends AppError {
  constructor(message: string, warnings: any[] = []) {
    super(message, 400, 'SAFETY_ERROR', { warnings });
  }
}

export const handleDatabaseError = (error: any): AppError => {
  if (error.code === '23505') { // Unique violation
    return new ConflictError('Resource already exists');
  }
  if (error.code === '23503') { // Foreign key violation
    return new ValidationError('Referenced resource does not exist');
  }
  if (error.code === '23514') { // Check constraint violation
    return new ValidationError('Data validation failed');
  }
  if (error.code === '08006') { // Connection failure
    return new ServiceUnavailableError('Database connection failed');
  }
  if (error.code === '40001') { // Serialization failure
    return new ServiceUnavailableError('Transaction conflict, please retry');
  }
  return new AppError('Database operation failed', 500);
};

export const sanitizeInput = (input: string): string => {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/\0/g, '')
    .replace(/\x00/g, '')
    .trim();
};

export const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const validateRequired = (fields: Record<string, any>, requiredFields: string[]): void => {
  const missing = requiredFields.filter(field => !fields[field] || fields[field].toString().trim() === '');
  if (missing.length > 0) {
    throw new ValidationError(`Required fields missing: ${missing.join(', ')}`);
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[0-9\s-()]{10,15}$/;
  return phoneRegex.test(phone);
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate.toISOString().startsWith(date.split('T')[0]);
};

export const validateNumeric = (value: any, min?: number, max?: number): boolean => {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};
