import request from 'supertest';
import { app } from '../../app';
import { dataRetentionService } from '../../services/data-retention.service';

describe('Data Retention Integration Tests', () => {
  let adminToken: string;
  let policyId: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!'
      });
    adminToken = loginRes.body.token;
  });

  describe('Policy Management', () => {
    it('should create a data retention policy', async () => {
      const policyData = {
        name: 'Test Audit Log Retention',
        dataType: 'audit_logs',
        retentionPeriod: 90,
        unit: 'days',
        autoDelete: true,
        archiveBeforeDelete: true
      };

      const res = await request(app)
        .post('/api/data-retention')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(policyData);

      expect(res.status).toBe(201);
      expect(res.body.policyId).toBeDefined();
      policyId = res.body.policyId;
    });

    it('should get all retention policies', async () => {
      const res = await request(app)
        .get('/api/data-retention')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get specific retention policy', async () => {
      const res = await request(app)
        .get(`/api/data-retention/${policyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(policyId);
    });

    it('should update retention policy', async () => {
      const updates = {
        retentionPeriod: 120,
        autoDelete: false
      };

      const res = await request(app)
        .put(`/api/data-retention/${policyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(res.status).toBe(200);
    });

    it('should execute retention policy (dry run)', async () => {
      const res = await request(app)
        .post('/api/data-retention/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          policyId,
          dryRun: true
        });

      expect(res.status).toBe(200);
      expect(res.body.itemsToArchive).toBeDefined();
      expect(res.body.itemsToDelete).toBeDefined();
    });

    it('should delete retention policy', async () => {
      const res = await request(app)
        .delete(`/api/data-retention/${policyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Access Control', () => {
    let doctorToken: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'Test123!'
        });
      doctorToken = loginRes.body.token;
    });

    it('should deny access to non-admin users', async () => {
      const res = await request(app)
        .get('/api/data-retention')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('should deny policy creation to non-admin users', async () => {
      const policyData = {
        name: 'Unauthorized Policy',
        dataType: 'audit_logs',
        retentionPeriod: 30,
        unit: 'days',
        autoDelete: false,
        archiveBeforeDelete: true
      };

      const res = await request(app)
        .post('/api/data-retention')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(policyData);

      expect(res.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should validate policy creation data', async () => {
      const invalidData = {
        name: '',
        dataType: 'invalid_type',
        retentionPeriod: -1,
        unit: 'invalid_unit'
      };

      const res = await request(app)
        .post('/api/data-retention')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
    });

    it('should validate execution parameters', async () => {
      const res = await request(app)
        .post('/api/data-retention/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          policyId: 'invalid-uuid',
          dryRun: 'not-boolean'
        });

      expect(res.status).toBe(400);
    });
  });
});