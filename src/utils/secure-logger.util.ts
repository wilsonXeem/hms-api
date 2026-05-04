import winston from 'winston';
import { enhancedSanitizer } from './enhanced-sanitizer.util';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export const secureLog = {
  info: (message: string, meta?: any) => {
    logger.info(enhancedSanitizer.log(message), meta ? { meta: enhancedSanitizer.log(meta) } : {});
  },
  error: (message: string, error?: any) => {
    logger.error(enhancedSanitizer.log(message), error ? { error: enhancedSanitizer.log(error) } : {});
  },
  warn: (message: string, meta?: any) => {
    logger.warn(enhancedSanitizer.log(message), meta ? { meta: enhancedSanitizer.log(meta) } : {});
  },
  debug: (message: string, meta?: any) => {
    logger.debug(enhancedSanitizer.log(message), meta ? { meta: enhancedSanitizer.log(meta) } : {});
  }
};

// Backward compatibility
export const secureLogger = secureLog;