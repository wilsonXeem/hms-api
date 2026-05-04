import crypto from 'crypto';

interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SecurityValidator {
  static validateEnvironmentSecurity(): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required security environment variables
    const requiredSecurityVars = [
      'JWT_SECRET',
      'CSRF_SECRET', 
      'SESSION_SECRET'
    ];

    for (const varName of requiredSecurityVars) {
      const value = process.env[varName];
      
      if (!value || value.trim() === '') {
        errors.push(`${varName} is not set or empty`);
      } else if (value.length < 32) {
        warnings.push(`${varName} should be at least 32 characters long`);
      }
    }

    // HTTPS is commonly terminated by a platform/load balancer (Render, Fly,
    // Heroku, etc.). Only require local cert files when this Node process is
    // explicitly configured to own HTTPS termination.
    if (process.env.NODE_ENV === 'production') {
      if (process.env.FORCE_HTTPS === 'true' && (!process.env.SSL_CERT_PATH || !process.env.SSL_KEY_PATH)) {
        errors.push('SSL certificate paths must be configured when FORCE_HTTPS is true');
      }

      if (process.env.FORCE_HTTPS !== 'true') {
        warnings.push('FORCE_HTTPS is not enabled in the Node process; ensure the hosting platform terminates HTTPS');
      }
    }

    // Check database URL doesn't contain default credentials
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && (dbUrl.includes('username:password') || dbUrl.includes('user:pass'))) {
      errors.push('Database URL contains default/placeholder credentials');
    }

    // Check for test credentials in production
    if (process.env.NODE_ENV === 'production') {
      const testVars = ['TEST_EMAIL', 'TEST_PASSWORD', 'TEST_FACILITY_ID'];
      for (const testVar of testVars) {
        if (process.env[testVar]) {
          warnings.push(`${testVar} should not be set in production environment`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64');
  }

  static validatePasswordStrength(password: string): boolean {
    // At least 12 characters, contains uppercase, lowercase, number, and special character
    const minLength = 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return password.length >= minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  }

  static sanitizeForLog(data: any): any {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'ssn', 'credit_card', 'cvv', 'api_key'
    ];

    if (typeof data === 'string') {
      return '[REDACTED]';
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => keyLower.includes(sensitiveKey));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeForLog(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Startup security validation
export const validateSecurityOnStartup = (): void => {
  const validation = SecurityValidator.validateEnvironmentSecurity();
  
  if (!validation.isValid) {
    console.error('❌ Security validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to security configuration errors in production');
      process.exit(1);
    }
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Security warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Security validation passed');
  }
};
