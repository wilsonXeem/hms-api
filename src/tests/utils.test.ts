import { 
  sanitizeInput, 
  validateEmail, 
  validatePhone, 
  validateUUID,
  AppError,
  ValidationError 
} from '../utils/errors.util';
import { generateToken, verifyToken } from '../utils/jwt.util';
import { hashPassword, comparePassword } from '../utils/helpers.util';
import { formatResponse } from '../utils/response.util';
import { paginate } from '../utils/pagination.util';

describe('Utility Functions', () => {
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    it('should remove HTML tags', () => {
      const input = '<div>Hello <b>World</b></div>';
      expect(sanitizeInput(input)).toBe('Hello World');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should preserve safe content', () => {
      const input = 'Hello World 123';
      expect(sanitizeInput(input)).toBe(input);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phones', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('+44 20 7946 0958')).toBe(true);
      expect(validatePhone('(555) 123-4567')).toBe(true);
    });

    it('should reject invalid phones', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('123')).toBe(false);
    });
  });

  describe('JWT Utils', () => {
    it('should generate and verify tokens', () => {
      const payload = { id: '123', email: 'test@test.com' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    it('should handle invalid tokens', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  });

  describe('Password Utils', () => {
    it('should hash and compare passwords', async () => {
      const password = 'testpassword123';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      
      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
      
      const isInvalid = await comparePassword('wrongpassword', hashed);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Response Utils', () => {
    it('should format success responses', () => {
      const data = { user: { id: '123' } };
      const response = formatResponse(true, 'Success', data);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
    });

    it('should format error responses', () => {
      const response = formatResponse(false, 'Error occurred');
      
      expect(response.success).toBe(false);
      expect(response.message).toBe('Error occurred');
      expect(response.data).toBeUndefined();
    });
  });

  describe('Pagination Utils', () => {
    it('should calculate pagination correctly', () => {
      const result = paginate(1, 10, 100);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(10);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle edge cases', () => {
      const result = paginate(10, 10, 100);
      
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('Error Classes', () => {
    it('should create AppError correctly', () => {
      const error = new AppError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle error serialization', () => {
      const error = new AppError('Test error', 500);
      const serialized = JSON.stringify(error);
      
      expect(serialized).toContain('Test error');
    });
  });
});