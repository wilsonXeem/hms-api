import request from 'supertest';
import { app } from '../../app';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return 200 for health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
    });
  });

  describe('Authentication Flow', () => {
    it('should register and login user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      };

      // Register
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
    });
  });
});