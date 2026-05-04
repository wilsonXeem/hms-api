import { logger } from './logger.util';

// Sanitize input to prevent log injection
export const sanitizeLogInput = (input: any): string => {
  if (typeof input !== 'string') {
    input = JSON.stringify(input);
  }
  
  // Remove or escape potentially dangerous characters
  return input
    .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
    .substring(0, 1000); // Limit length
};

// Safe logging functions
export const safeLogger = {
  info: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeLogInput(message);
    const sanitizedData = data ? sanitizeLogInput(data) : undefined;
    logger.info(sanitizedMessage, sanitizedData);
  },
  
  error: (message: string, error?: any) => {
    const sanitizedMessage = sanitizeLogInput(message);
    const sanitizedError = error ? sanitizeLogInput(error) : undefined;
    logger.error(sanitizedMessage, sanitizedError);
  },
  
  warn: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeLogInput(message);
    const sanitizedData = data ? sanitizeLogInput(data) : undefined;
    logger.warn(sanitizedMessage, sanitizedData);
  },
  
  debug: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeLogInput(message);
    const sanitizedData = data ? sanitizeLogInput(data) : undefined;
    logger.debug(sanitizedMessage, sanitizedData);
  }
};