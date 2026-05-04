import request from 'supertest';
import { app } from '../../app';
import { performance } from 'perf_hooks';

describe('Performance Testing', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@test.com', password: 'Test123!' });
    authToken = loginRes.body.token;
  });

  describe('API Response Times', () => {
    it('should respond to health check within 100ms', async () => {
      const start = performance.now();
      const res = await request(app).get('/api/health');
      const duration = performance.now() - start;
      
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('should handle patient list within 500ms', async () => {
      const start = performance.now();
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = performance.now() - start;
      
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent requests', async () => {
      const start = performance.now();
      const promises = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/health')
      );
      
      const results = await Promise.all(promises);
      const duration = performance.now() - start;
      
      expect(results.every(r => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Database Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      const start = performance.now();
      const res = await request(app)
        .get('/api/patients?limit=1000')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = performance.now() - start;
      
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle complex search queries', async () => {
      const start = performance.now();
      const res = await request(app)
        .get('/api/patients/search?q=test&filters=active')
        .set('Authorization', `Bearer ${authToken}`);
      const duration = performance.now() - start;
      
      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(800);
    });
  });

  describe('Memory Usage', () => {
    it('should not exceed memory limits during bulk operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const promises = Array(100).fill(null).map((_, i) =>
        request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: `Test${i}`,
            lastName: 'User',
            email: `test${i}@test.com`,
            phone: '1234567890',
            dateOfBirth: '1990-01-01'
          })
      );
      
      await Promise.allSettled(promises);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      const requests: Promise<any>[] = [];
      
      while (Date.now() - startTime < duration) {
        requests.push(
          request(app)
            .get('/api/health')
            .timeout(1000)
        );
        
        if (requests.length >= 50) {
          await Promise.allSettled(requests.splice(0, 25));
        }
      }
      
      const results = await Promise.allSettled(requests);
      const successRate = results.filter(r => r.status === 'fulfilled').length / results.length;
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
    });
  });
});