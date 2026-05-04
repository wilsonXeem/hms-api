import request from 'supertest';
import { app } from '../../app';

describe('Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should complete full auth flow', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'doctor'
        });
      
      expect(registerRes.status).toBe(201);
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });
  });

  describe('Patient Management Flow', () => {
    let authToken: string;
    
    beforeEach(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });
      authToken = loginRes.body.token;
    });

    it('should create, read, update, delete patient', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        dateOfBirth: '1990-01-01'
      };

      const createRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);
      
      expect(createRes.status).toBe(201);
      const patientId = createRes.body.id;

      const readRes = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(readRes.status).toBe(200);
      expect(readRes.body.firstName).toBe('John');

      const updateRes = await request(app)
        .put(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...patientData, firstName: 'Jane' });
      
      expect(updateRes.status).toBe(200);

      const deleteRes = await request(app)
        .delete(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      );
      
      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });
});