import winston from 'winston';
import path from 'path';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'hospital-management' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    // Audit logs
    new winston.transports.File({
      filename: path.join('logs', 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 30
    })
  ]
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security event logging
export const securityLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'security.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 60 // 2 months retention
    })
  ]
});

// Performance logging
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'performance' },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'performance.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 7 // 1 week retention
    })
  ]
});

export { logger };