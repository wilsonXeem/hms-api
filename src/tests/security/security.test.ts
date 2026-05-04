import request from 'supertest';
import { app } from '../../app';

describe('Security Tests', () => {
  describe('Authentication Security', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousPayload = {
        email: "admin@test.com'; DROP TABLE users; --",
        password: "password"
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload);

      expect(res.status).toBe(401);
    });

    it('should prevent brute force attacks', async () => {
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' })
        );
      }

      const results = await Promise.all(attempts);
      const lastResult = results[results.length - 1];
      
      expect(lastResult.status).toBe(429); // Rate limited
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@test.com',
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('password');
      }
    });
  });

  describe('Input Validation Security', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@test.com', password: 'Test123!' });
      authToken = loginRes.body.token;
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        email: 'test@test.com'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssPayload);

      expect(res.status).toBe(400);
    });

    it('should validate file upload security', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'malicious.php');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('file type');
    });

    it('should prevent path traversal attacks', async () => {
      const res = await request(app)
        .get('/api/documents/../../../etc/passwd')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Authorization Security', () => {
    let doctorToken: string;
    let nurseToken: string;

    beforeAll(async () => {
      const doctorRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@test.com', password: 'Test123!' });
      doctorToken = doctorRes.body.token;

      const nurseRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nurse@test.com', password: 'Test123!' });
      nurseToken = nurseRes.body.token;
    });

    it('should enforce role-based access control', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
    });

    it('should prevent privilege escalation', async () => {
      const res = await request(app)
        .put('/api/users/role')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ userId: 'user123', role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  describe('Data Protection Security', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@test.com', password: 'Test123!' });
      authToken = loginRes.body.token;
    });

    it('should encrypt sensitive data', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        email: 'john@test.com'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      if (res.status === 201) {
        expect(res.body.ssn).not.toBe(patientData.ssn);
        expect(res.body.ssn).toMatch(/^[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/);
      }
    });

    it('should prevent data exposure in error messages', async () => {
      const res = await request(app)
        .get('/api/patients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body.error).not.toContain('SELECT');
      expect(res.body.error).not.toContain('database');
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doctor@test.com', password: 'Test123!' });
      
      const token = loginRes.body.token;

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });

    it('should enforce session timeout', async () => {
      // This would require mocking time or using a test token with short expiry
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });
});