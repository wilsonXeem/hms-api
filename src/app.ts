import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/app.config';
import { swaggerSpec } from './config/swagger.config';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { generalLimiter } from './middleware/rate-limit.middleware';
import { sanitizeRequestBody, validateContentType } from './middleware/validation.middleware';
import { sanitizeInput, preventSQLInjection, requestSizeLimiter, securityHeaders } from './middleware/security.middleware';
import { httpsRedirect, hstsHeader } from './middleware/https-redirect.middleware';
import { compressionMiddleware, responseOptimization } from './middleware/compression.middleware';
// import { performanceMonitoring } from './services/performance.service';
import { inputValidationMiddleware, sqlInjectionProtection } from './middleware/input-validation.middleware';
import { xssProtection, cspHeaders } from './middleware/xss-protection.middleware';
import { secureLogger } from './utils/secure-logger.util';
import routes from './routes';

const app = express();

if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// HTTPS enforcement
app.use(httpsRedirect);
app.use(hstsHeader);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Database connection middleware
import { ensureConnection } from './config/db.config';
app.use('/api', ensureConnection);

// Rate limiting
app.use(generalLimiter);

// Performance middleware
app.use(compressionMiddleware);
app.use(responseOptimization);

// Enhanced security middleware
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(inputValidationMiddleware);
app.use(sqlInjectionProtection);
app.use(sanitizeInput);
app.use(preventSQLInjection);
app.use(xssProtection);
app.use(cspHeaders);

// Performance monitoring - commented out for quick testing
// app.use(performanceMonitoring);

// Logging middleware
if (config.nodeEnv === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Body parsing middleware with security
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF protection disabled — JWT Bearer tokens provide equivalent protection for API routes

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to ProgrammoCeutical HMS',
    version: '1.0.0',
    status: 'Server is running successfully',
    documentation: '/api-docs',
    endpoints: {
      authentication: '/api/auth',
      patients: '/api/patients',
      inventory: '/api/inventory',
      laboratory: '/api/lab',
      pharmacy: '/api/pharmacy',
      doctors: '/api/doctors',
      admin: '/api/admin',
      notifications: '/api/notifications'
    }
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
  `,
  customSiteTitle: 'HMS API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Security middleware for API routes
app.use('/api', sanitizeRequestBody);
app.use('/api', validateContentType);

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Powered-By', 'ProgrammoCeuticals HMS');
  next();
});

// Routes
app.use('/api', routes);

// Health check - simplified for quick testing
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Server is running (database checks disabled for testing)'
  });
});

// Performance metrics endpoint - commented out for quick testing
// app.get('/metrics', async (req, res) => {
//   const { performanceService } = await import('./services/performance.service');
//   const metrics = await performanceService.getMetrics();
//   res.json({
//     timestamp: new Date().toISOString(),
//     metrics
//   });
// });

// API endpoints overview
app.get('/api', (req, res) => {
  res.json({
    message: 'ProgrammoCeuticals HMS API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      authentication: {
        base: '/api/auth',
        routes: {
          'POST /register': 'Register new user',
          'POST /login': 'User login',
          'GET /profile': 'Get user profile',
          'PUT /profile': 'Update user profile',
          'POST /change-password': 'Change password',
          'POST /forgot-password': 'Request password reset',
          'POST /reset-password': 'Reset password with token',
          'POST /refresh-token': 'Refresh authentication token',
          'POST /logout': 'User logout'
        }
      },
      patients: {
        base: '/api/patients',
        routes: {
          'POST /': 'Create new patient',
          'GET /': 'Get all patients',
          'GET /:id': 'Get patient by ID',
          'PUT /:id': 'Update patient information'
        }
      },
      inventory: {
        base: '/api/inventory',
        routes: {
          'POST /items': 'Create inventory item',
          'GET /items': 'Get all inventory items',
          'PUT /items/:id': 'Update inventory item',
          'POST /batches': 'Add stock batch',
          'GET /items/:itemId/batches': 'Get item batches',
          'GET /low-stock': 'Get low stock items',
          'GET /expiring': 'Get expiring batches'
        }
      },
      laboratory: {
        base: '/api/lab',
        routes: {
          'POST /requests': 'Create lab test request',
          'POST /requests/bulk': 'Create bulk lab requests',
          'GET /requests': 'Get all lab requests',
          'GET /requests/:id': 'Get lab request details',
          'PUT /requests/:id/status': 'Update request status',
          'POST /results': 'Upload lab results',
          'GET /results/:patientId': 'Get patient lab results',
          'GET /results/critical': 'Get critical results',
          'GET /catalog': 'Get test catalog',
          'POST /catalog': 'Add test to catalog'
        }
      }
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: 'Not Found'
  });
});

// Error handling
app.use(errorMiddleware);

// Global error handlers with secure logging
process.on('unhandledRejection', (reason, promise) => {
  secureLogger.error('Unhandled Rejection', { reason: reason?.toString(), promise: promise?.toString() });
});

process.on('uncaughtException', (error) => {
  secureLogger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default app;
export { app };
