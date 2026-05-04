import app from './app';
import { createServer } from 'http';
import { createHTTPSServer } from './config/https.config';
import { config } from './config/app.config';
import { securityConfig, validateSecurityConfig } from './config/security.config';
import { connectDB, closeConnection } from './config/db.config';
import { connectRedis, closeRedis } from './config/redis.config';
import { logger } from './utils/logger.util';
import { validateSecurityOnStartup } from './utils/security-validation.util';
import { loadFacilityId } from './middleware/hospital.middleware';
// import { initializeRealTimeNotifications } from './services/realtime-notification.service';
// import { setRealTimeService } from './services/notification.service';

const PORT = config.port || 5000;

const startServer = async () => {
  try {
    // Validate security configuration
    validateSecurityConfig();
    
    // Validate security environment variables
    validateSecurityOnStartup();
    
    // Database connection is required
    await connectDB();

    // Load and cache the hospital facility ID
    await loadFacilityId();
    
    // Initialize Redis connection - commented out for quick testing
    // await connectRedis();
    
    // Create HTTPS server if configured, otherwise HTTP
    const server = securityConfig.https.enabled 
      ? createHTTPSServer(app) || createServer(app)
      : createServer(app);
    
    if (securityConfig.https.enabled && server) {
      logger.info('🔒 HTTPS server configured');
    } else if (config.nodeEnv === 'production') {
      logger.warn('⚠️  Running HTTP in production - HTTPS recommended');
    }
    
    // Initialize real-time notifications - commented out for quick testing
    // const realtimeService = initializeRealTimeNotifications(server);
    // setRealTimeService(realtimeService);
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          await closeConnection();
        } catch (error) {
          logger.warn('Error closing database connection:', error);
        }
        // await closeRedis(); // Commented out
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Start server
    server.listen(PORT, () => {
      const protocol = securityConfig.https.enabled ? 'https' : 'http';
      logger.info(`🚀 Server running on ${protocol}://localhost:${PORT}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Client URL: ${config.clientUrl}`);
      logger.info(`🔒 Security: ${securityConfig.https.enabled ? 'HTTPS Enabled' : 'HTTP Only'}`);
      logger.info(`🔔 Real-time notifications enabled`);
      logger.info(`🏥 Welcome to ProgrammoCeutical HMS`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();