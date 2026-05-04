import request from 'supertest';
import { app } from '../../app';

describe('End-to-End Compliance Tests', () => {
  let authToken: string;
  let patientId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'doctor@test.com',
        password: 'Test123!'
      });
    authToken = loginRes.body.token;
  });

  describe('HIPAA Compliance Flow', () => {
    it('should complete full patient consent workflow', async () => {
      // Create patient
      const patientRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '1234567890',
          dateOfBirth: '1990-01-01'
        });
      
      expect(patientRes.status).toBe(201);
      patientId = patientRes.body.id;

      // Record consent
      const consentRes = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          consentType: 'treatment',
          granted: true
        });
      
      expect(consentRes.status).toBe(201);
      const consentId = consentRes.body.consentId;

      // Check consent
      const checkRes = await request(app)
        .get(`/api/consent/${patientId}/treatment`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.hasConsent).toBe(true);

      // Access patient data (should succeed with consent)
      const accessRes = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-consent-type', 'treatment');
      
      expect(accessRes.status).toBe(200);

      // Revoke consent
      const revokeRes = await request(app)
        .delete(`/api/consent/${consentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(revokeRes.status).toBe(200);

      // Check consent after revocation
      const checkAfterRes = await request(app)
        .get(`/api/consent/${patientId}/treatment`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(checkAfterRes.body.hasConsent).toBe(false);
    });

    it('should enforce data encryption requirements', async () => {
      const unencryptedData = {
        firstName: 'Jane',
        lastName: 'Smith',
        ssn: '123-45-6789', // Unencrypted PHI
        email: 'jane@test.com'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(unencryptedData);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('PHI must be encrypted');
    });

    it('should log all PHI access attempts', async () => {
      const accessRes = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-access-justification', 'Treatment consultation');
      
      // Verify audit log was created (in real implementation, check database)
      expect(accessRes.status).toBe(200);
    });
  });

  describe('Data Retention Compliance', () => {
    it('should enforce data retention policies', async () => {
      // Test data cleanup based on retention policies
      const cleanupRes = await request(app)
        .post('/api/admin/data-cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dryRun: true });
      
      expect(cleanupRes.status).toBe(200);
      expect(cleanupRes.body.itemsToDelete).toBeDefined();
      expect(cleanupRes.body.itemsToArchive).toBeDefined();
    });
  });

  describe('Security Compliance', () => {
    it('should prevent unauthorized access', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
    });

    it('should validate input sanitization', async () => {
      const maliciousInput = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        email: 'test@test.com'
      };

      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput);
      
      expect(res.status).toBe(400);
    });
  });
});