import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

import { mockRequest, mockResponse, mockNext } from './test-helpers';

jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer valid-token' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      const mockUser = { id: '123', email: 'test@test.com', role: 'doctor' };
      mockJwt.verify.mockReturnValue(mockUser as any);

      authenticateToken(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing token', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
    });

    it('should reject invalid token', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireRole', () => {
    it('should allow access for correct role', () => {
      const req = mockRequest({
        user: { role: 'admin' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for incorrect role', () => {
      const req = mockRequest({
        user: { role: 'doctor' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('validateRequest', () => {
    it('should pass validation with valid data', () => {
      const req = mockRequest({
        body: { email: 'test@test.com', password: 'password123' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      // Mock validation result
      (req as any).validationResult = jest.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      validateRequest(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid data', () => {
      const req = mockRequest({
        body: { email: 'invalid-email' }
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext as NextFunction;

      // Mock validation result with errors
      (req as any).validationResult = jest.fn().mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid email format' }]
      });

      validateRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});