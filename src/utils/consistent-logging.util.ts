import winston from 'winston';
import { enhancedSanitizer } from './enhanced-sanitizer.util';

// Structured logging levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log categories for better organization
export enum LogCategory {
  AUTH = 'auth',
  PATIENT = 'patient',
  INVENTORY = 'inventory',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  SECURITY = 'security',
  SYSTEM = 'system',
  AUDIT = 'audit'
}

interface LogContext {
  userId?: string;
  facilityId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  category?: LogCategory;
  metadata?: Record<string, any>;
  statusCode?: number;
  path?: string;
  method?: string;
  stack?: string;
  errorName?: string;
}

class ConsistentLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message: enhancedSanitizer.log(message),
            ...this.sanitizeMetadata(meta)
          });
        })
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10
        }),
        new winston.transports.File({
          filename: 'logs/audit.log',
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 50 * 1024 * 1024, // 50MB for audit logs
          maxFiles: 20
        })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  private sanitizeMetadata(meta: any): any {
    if (!meta) return {};
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(meta)) {
      sanitized[key] = enhancedSanitizer.log(value);
    }
    return sanitized;
  }

  private formatMessage(message: string, context?: LogContext): string {
    const prefix = context?.category ? `[${context.category.toUpperCase()}]` : '';
    return `${prefix} ${message}`;
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(this.formatMessage(message, context), context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message, context), context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.formatMessage(message, context), context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message, context), context);
  }

  // Audit logging for compliance
  audit(action: string, context: LogContext): void {
    this.logger.info(`AUDIT: ${action}`, {
      ...context,
      category: LogCategory.AUDIT,
      auditLog: true
    });
  }

  // Security event logging
  security(event: string, context: LogContext): void {
    this.logger.warn(`SECURITY: ${event}`, {
      ...context,
      category: LogCategory.SECURITY,
      securityEvent: true
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    this.logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
      ...context,
      duration,
      performanceLog: true
    });
  }
}

export const consistentLogger = new ConsistentLogger();

// Helper functions for common logging patterns
export const logUserAction = (action: string, userId: string, facilityId: string, metadata?: any) => {
  consistentLogger.audit(action, {
    userId,
    facilityId,
    action,
    metadata
  });
};

export const logSecurityEvent = (event: string, ip: string, userAgent?: string, metadata?: any) => {
  consistentLogger.security(event, {
    ip,
    userAgent,
    metadata
  });
};

export const logError = (error: Error, context?: LogContext) => {
  consistentLogger.error(error.message, {
    ...context,
    stack: error.stack,
    errorName: error.name
  });
};

export const logPerformance = (operation: string, startTime: number, context?: LogContext) => {
  const duration = Date.now() - startTime;
  consistentLogger.performance(operation, duration, context);
};