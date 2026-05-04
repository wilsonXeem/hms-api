import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './app.config';
import { logger } from '../utils/logger.util';

const connectionString = config.database.url;

// Optimized connection pool configuration
const client = postgres(connectionString, {
  max: 30, // Increased pool size
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: true, // Enable prepared statements
  onnotice: () => {},
  onparameter: () => {},
  transform: {
    undefined: null
  },
  // Performance optimizations
  connection: {
    application_name: 'HMS_Server',
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 60000,
  }
});

// Read replica for read-only operations
const readClient = postgres(process.env.DATABASE_READ_URL || connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: true,
  // readonly: true // Commented out as not supported in this version
});

export const db = drizzle(client);
export const readDb = drizzle(readClient);

// Query performance monitoring
export const withPerformanceMonitoring = async <T>(
  operation: () => Promise<T>,
  queryName: string
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Query failed: ${queryName}`, error);
    throw error;
  }
};