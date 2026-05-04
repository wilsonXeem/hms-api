import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { labRequests } from '../models/lab-requests.model';
import { labResults } from '../models/lab-results.model';
import { testCatalog } from '../models/test-catalog.model';
import { createMockLabRequest, mockDbSelect, mockDbInsert, mockDbUpdate, createAuthToken } from './test-helpers';

jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Lab Controller', () => {
  const authToken = createAuthToken({ role: 'lab_technician' });
  const doctorToken = createAuthToken({ role: 'doctor' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/lab/requests', () => {
    it('should create lab request successfully', async () => {
      const requestData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        tests: ['CBC', 'Blood Sugar'],
        priority: 'normal',
        notes: 'Routine checkup',
        urgentReason: null
      };

      const newRequest = createMockLabRequest(requestData);
      mockDb.insert.mockReturnValue(mockDbInsert([newRequest]));

      const response = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.request.tests).toEqual(requestData.tests);
    });

    it('should return error for missing required fields', async () => {
      const requestData = {
        tests: ['CBC']
      };

      const response = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create urgent request with reason', async () => {
      const requestData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        tests: ['Troponin', 'D-Dimer'],
        priority: 'urgent',
        urgentReason: 'Suspected MI',
        notes: 'Emergency case'
      };

      const newRequest = createMockLabRequest(requestData);
      mockDb.insert.mockReturnValue(mockDbInsert([newRequest]));

      const response = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body.data.request.priority).toBe('urgent');
    });

    it('should return error for invalid priority', async () => {
      const requestData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        tests: ['CBC'],
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(requestData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/lab/requests', () => {
    it('should get lab requests with pagination', async () => {
      const mockRequests = [
        createMockLabRequest({ tests: ['CBC'] }),
        createMockLabRequest({ tests: ['Blood Sugar'] })
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockRequests));

      const response = await request(app)
        .get('/api/lab/requests?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.requests).toHaveLength(2);
    });

    it('should filter requests by status', async () => {
      const pendingRequests = [createMockLabRequest({ status: 'pending' })];
      mockDb.select.mockReturnValue(mockDbSelect(pendingRequests));

      const response = await request(app)
        .get('/api/lab/requests?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.requests).toHaveLength(1);
    });

    it('should filter requests by priority', async () => {
      const urgentRequests = [createMockLabRequest({ priority: 'urgent' })];
      mockDb.select.mockReturnValue(mockDbSelect(urgentRequests));

      const response = await request(app)
        .get('/api/lab/requests?priority=urgent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.requests).toHaveLength(1);
    });
  });

  describe('GET /api/lab/requests/:id', () => {
    it('should get lab request by ID', async () => {
      const mockRequest = createMockLabRequest();
      mockDb.select.mockReturnValue(mockDbSelect([mockRequest]));

      const response = await request(app)
        .get(`/api/lab/requests/${mockRequest.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.request.id).toBe(mockRequest.id);
    });

    it('should return 404 for non-existent request', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/lab/requests/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/lab/requests/:id/status', () => {
    it('should update request status to in-progress', async () => {
      const requestId = '123e4567-e89b-12d3-a456-426614174004';
      const updatedRequest = createMockLabRequest({ id: requestId, status: 'in-progress' });
      
      mockDb.update.mockReturnValue(mockDbUpdate([updatedRequest]));

      const response = await request(app)
        .put(`/api/lab/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in-progress' });

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('in-progress');
    });

    it('should return error for invalid status', async () => {
      const requestId = '123e4567-e89b-12d3-a456-426614174004';

      const response = await request(app)
        .put(`/api/lab/requests/${requestId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/lab/results', () => {
    it('should upload lab results successfully', async () => {
      const resultData = {
        requestId: '123e4567-e89b-12d3-a456-426614174004',
        results: {
          'CBC': {
            'WBC': '7.5 x10^3/μL',
            'RBC': '4.8 x10^6/μL',
            'Hemoglobin': '14.2 g/dL',
            'Hematocrit': '42%'
          },
          'Blood Sugar': '95 mg/dL'
        },
        status: 'completed',
        notes: 'All values within normal range',
        criticalValues: []
      };

      const newResult = { id: 'result-id', ...resultData };
      const updatedRequest = createMockLabRequest({ id: resultData.requestId, status: 'completed' });
      
      mockDb.insert.mockReturnValue(mockDbInsert([newResult]));
      mockDb.update.mockReturnValue(mockDbUpdate([updatedRequest]));

      const response = await request(app)
        .post('/api/lab/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resultData);

      expect(response.status).toBe(201);
      expect(response.body.data.result.results).toEqual(resultData.results);
    });

    it('should detect and flag critical values', async () => {
      const resultData = {
        requestId: '123e4567-e89b-12d3-a456-426614174004',
        results: {
          'Blood Sugar': '350 mg/dL',
          'Creatinine': '5.2 mg/dL'
        },
        status: 'completed',
        criticalValues: ['Blood Sugar: 350 mg/dL (Critical High)', 'Creatinine: 5.2 mg/dL (Critical High)']
      };

      const newResult = { id: 'result-id', ...resultData };
      mockDb.insert.mockReturnValue(mockDbInsert([newResult]));
      mockDb.update.mockReturnValue(mockDbUpdate([]));

      const response = await request(app)
        .post('/api/lab/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resultData);

      expect(response.status).toBe(201);
      expect(response.body.data.criticalAlert).toBe(true);
      expect(response.body.data.result.criticalValues).toHaveLength(2);
    });

    it('should return error for missing request ID', async () => {
      const resultData = {
        results: { 'CBC': 'Normal' },
        status: 'completed'
      };

      const response = await request(app)
        .post('/api/lab/results')
        .set('Authorization', `Bearer ${authToken}`)
        .send(resultData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/lab/results/:requestId', () => {
    it('should get lab results by request ID', async () => {
      const requestId = '123e4567-e89b-12d3-a456-426614174004';
      const mockResults = [{
        id: 'result-1',
        requestId,
        results: { 'CBC': 'Normal' },
        status: 'completed'
      }];
      mockDb.select.mockReturnValue(mockDbSelect(mockResults));

      const response = await request(app)
        .get(`/api/lab/results/${requestId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.results).toHaveLength(1);
    });
  });

  describe('GET /api/lab/test-catalog', () => {
    it('should get available tests catalog', async () => {
      const mockTests = [
        { id: '1', testName: 'CBC', category: 'Hematology', normalRange: '4.5-11.0 x10^3/μL' },
        { id: '2', testName: 'Blood Sugar', category: 'Chemistry', normalRange: '70-100 mg/dL' }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockTests));

      const response = await request(app)
        .get('/api/lab/test-catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tests).toHaveLength(2);
    });

    it('should filter tests by category', async () => {
      const hematologyTests = [{ testName: 'CBC', category: 'Hematology' }];
      mockDb.select.mockReturnValue(mockDbSelect(hematologyTests));

      const response = await request(app)
        .get('/api/lab/test-catalog?category=Hematology')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tests).toHaveLength(1);
    });
  });

  describe('GET /api/lab/stats', () => {
    it('should return lab statistics', async () => {
      const mockStats = {
        totalRequests: { count: 150 },
        pendingRequests: { count: 25 },
        completedToday: { count: 12 },
        urgentRequests: { count: 5 }
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockStats.totalRequests]))
        .mockReturnValueOnce(mockDbSelect([mockStats.pendingRequests]))
        .mockReturnValueOnce(mockDbSelect([mockStats.completedToday]))
        .mockReturnValueOnce(mockDbSelect([mockStats.urgentRequests]));

      const response = await request(app)
        .get('/api/lab/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalRequests).toBe(150);
      expect(response.body.data.pendingRequests).toBe(25);
    });
  });
});