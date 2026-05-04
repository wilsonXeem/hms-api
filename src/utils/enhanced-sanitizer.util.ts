import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Enhanced input sanitization utilities
export const enhancedSanitizer = {
  // Comprehensive HTML sanitization
  html: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return purify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  },

  // SQL injection prevention
  sql: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/['"`;\\]/g, '')
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  // Log injection prevention
  log: (input: any): string => {
    if (typeof input === 'object') {
      input = JSON.stringify(input);
    }
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[\r\n\t]/g, ' ')  // Remove line breaks and tabs
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .substring(0, 500); // Limit length
  },

  // Email sanitization
  email: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '');
  },

  // Phone number sanitization
  phone: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[^\d+\-\s()]/g, '');
  },

  // General text sanitization with length limits
  text: (input: string, maxLength: number = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>\"'&]/g, (match) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match] || match;
      })
      .substring(0, maxLength);
  },

  // Path traversal prevention
  path: (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/\.\.\./g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 255);
  },

  // Sanitize object recursively
  object: (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return enhancedSanitizer.html(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => enhancedSanitizer.object(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = enhancedSanitizer.text(key, 100);
        sanitized[sanitizedKey] = enhancedSanitizer.object(value);
      }
      return sanitized;
    }
    
    return obj;
  }
};

// Validation patterns
export const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[+]?[1-9]?[0-9]{7,15}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  name: /^[a-zA-Z\s'-]{1,50}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};