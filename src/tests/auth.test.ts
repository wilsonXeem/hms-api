import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';
import { db } from '../config/db.config';
import { users } from '../models/users.model';
import { createMockUser, mockDbSelect, mockDbInsert } from './test-helpers';

// Mock database
jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        role: 'doctor',
        facilityId: '123e4567-e89b-12d3-a456-426614174000'
      };

      // Mock user doesn't exist
      mockDb.select.mockReturnValue(mockDbSelect([]));
      
      // Mock user creation
      const newUser = createMockUser({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      });
      mockDb.insert.mockReturnValue(mockDbInsert([newUser]));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return error for missing required fields', async () => {
      const userData = {
        firstName: 'John',
        email: 'john.doe@test.com'
        // Missing lastName, password, role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Required fields missing');
    });

    it('should return error for invalid email format', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'password123',
        role: 'doctor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email format');
    });

    it('should return error for existing user', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@test.com',
        password: 'password123',
        role: 'doctor'
      };

      // Mock existing user
      mockDb.select.mockReturnValue(mockDbSelect([createMockUser({ email: userData.email })]));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      };
      
      if (!loginData.email || !loginData.password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in environment');
      }

      const hashedPassword = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash: hashedPassword,
        isActive: true
      });

      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock user not found
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return error for inactive user', async () => {
      const loginData = {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD
      };
      
      if (!loginData.email || !loginData.password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in environment');
      }

      const hashedPassword = await bcrypt.hash(loginData.password, 12);
      const mockUser = createMockUser({
        email: loginData.email,
        passwordHash: hashedPassword,
        isActive: false
      });

      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is deactivated');
    });

    it('should return error for missing fields', async () => {
      const loginData = {
        email: process.env.TEST_USER_EMAIL
        // Missing password
      };
      
      if (!loginData.email) {
        throw new Error('TEST_USER_EMAIL must be set in environment');
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Required fields missing');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile', async () => {
      const mockUser = createMockUser();
      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', global.mockAuthToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockUser.email);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      const mockUser = createMockUser();
      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: mockUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If email exists, reset instructions sent');
    });

    it('should return same message for non-existing user', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If email exists, reset instructions sent');
    });
  });
});