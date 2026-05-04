import crypto from 'crypto';

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
  };
  csrf: {
    secret: string;
  };
  session: {
    secret: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
  };
  https: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

// Generate secure random secrets if not provided
const generateSecureSecret = (length: number = 64): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const securityConfig: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || generateSecureSecret(),
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },
  csrf: {
    secret: process.env.CSRF_SECRET || generateSecureSecret()
  },
  session: {
    secret: process.env.SESSION_SECRET || generateSecureSecret()
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32
  },
  https: {
    enabled: process.env.FORCE_HTTPS === 'true',
    certPath: process.env.SSL_CERT_PATH,
    keyPath: process.env.SSL_KEY_PATH
  },
  rateLimit: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '900000'),
    max: parseInt(process.env.API_RATE_LIMIT_MAX || '100')
  }
};

// Validate security configuration
export const validateSecurityConfig = (): void => {
  const warnings: string[] = [];
  
  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET not set in environment variables - using generated secret');
  }
  
  if (!process.env.CSRF_SECRET) {
    warnings.push('CSRF_SECRET not set in environment variables - using generated secret');
  }
  
  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET not set in environment variables - using generated secret');
  }
  
  if (securityConfig.https.enabled && (!securityConfig.https.certPath || !securityConfig.https.keyPath)) {
    warnings.push('HTTPS enabled but SSL certificate paths not configured');
  }
  
  if (warnings.length > 0) {
    console.warn('Security Configuration Warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
  }
};