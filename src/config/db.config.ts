import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './app.config';
import { logger } from '../utils/logger.util';

const connectionString = config.database.url;
const client = postgres(connectionString, {
  max: 25,
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 3600,
  prepare: false,
  onnotice: () => {},
  onparameter: () => {},
  transform: {
    undefined: null
  },
  connection: {
    application_name: 'hospital_management_system',
    statement_timeout: 30000
  }
});

// Wrapper for database operations with retry logic
const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }
      logger.warn(`Database operation failed, retrying (${attempt}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
};

const isTransientError = (error: any): boolean => {
  const transientCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', '53300', '08006'];
  return transientCodes.some(code => 
    error.code === code || error.message?.includes(code)
  );
};

export const db = drizzle(client);

// Transaction wrapper with retry
export const transaction = async <T>(callback: (tx: typeof db) => Promise<T>): Promise<T> => {
  return withRetry(async () => {
    return await db.transaction(callback);
  });
};

// Database middleware for connection checking
export const ensureConnection = async (req: any, res: any, next: any) => {
  if (!isConnected) {
    try {
      await client`SELECT 1`;
      isConnected = true;
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable',
        error: 'Service Unavailable'
      });
    }
  }
  next();
};

let connectionAttempts = 0;
let isConnected = false;

export const connectDB = async (maxRetries = 5, retryDelay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client`SELECT 1`;
      isConnected = true;
      connectionAttempts = 0;
      logger.info('✅ Database connected successfully');
      
      // Set up connection monitoring
      setInterval(async () => {
        try {
          await client`SELECT 1`;
          if (!isConnected) {
            isConnected = true;
            logger.info('🔄 Database connection restored');
          }
        } catch (error) {
          if (isConnected) {
            isConnected = false;
            logger.error('💔 Database connection lost');
          }
        }
      }, 30000); // Check every 30 seconds
      
      return;
    } catch (error) {
      connectionAttempts++;
      logger.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt === maxRetries) {
        logger.error('🚨 CRITICAL: Database connection failed after all retries');
        throw new Error(`Database connection failed after ${maxRetries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

export const healthCheck = async () => {
  try {
    await client`SELECT 1`;
    return { status: 'healthy', connected: true };
  } catch (error) {
    logger.error('Database health check failed:', error);
    isConnected = false;
    return { status: 'unhealthy', connected: false, error: String(error) };
  }
};

export const getConnectionStatus = () => ({
  connected: isConnected,
  attempts: connectionAttempts,
  timestamp: new Date().toISOString(),
  poolSize: client.options.max,
  idleTimeout: client.options.idle_timeout
});

// Graceful shutdown
export const closeConnection = async () => {
  try {
    await client.end();
    logger.info('🔌 Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};