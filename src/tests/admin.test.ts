import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { users } from '../models/users.model';
import { facilities } from '../models/facilities.model';
import { activityLogs } from '../models/activity-logs.model';
import { mockDbSelect, mockDbInsert, mockDbUpdate, createAuthToken } from './test-helpers';

jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Admin Controller', () => {
  const adminToken = createAuthToken({ role: 'admin' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/users', () => {
    it('should create user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        role: 'doctor',
        department: 'Cardiology',
        phone: '+1234567890'
      };

      const newUser = { id: 'user-id', ...userData, isActive: true };
      mockDb.select.mockReturnValue(mockDbSelect([]));
      mockDb.insert.mockReturnValue(mockDbInsert([newUser]));

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@hospital.com',
        role: 'doctor'
      };

      mockDb.select.mockReturnValue(mockDbSelect([{ email: userData.email }]));

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get users with pagination', async () => {
      const mockUsers = [
        { id: '1', firstName: 'John', role: 'doctor', isActive: true },
        { id: '2', firstName: 'Jane', role: 'nurse', isActive: true }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockUsers));

      const response = await request(app)
        .get('/api/admin/users?limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(2);
    });

    it('should filter users by role', async () => {
      const doctors = [{ role: 'doctor', firstName: 'Dr. Smith' }];
      mockDb.select.mockReturnValue(mockDbSelect(doctors));

      const response = await request(app)
        .get('/api/admin/users?role=doctor')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(1);
    });

    it('should search users by name', async () => {
      const matchingUsers = [{ firstName: 'John', lastName: 'Doe' }];
      mockDb.select.mockReturnValue(mockDbSelect(matchingUsers));

      const response = await request(app)
        .get('/api/admin/users?search=John')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        firstName: 'Updated Name',
        department: 'Emergency'
      };

      const updatedUser = { id: userId, ...updateData };
      mockDb.update.mockReturnValue(mockDbUpdate([updatedUser]));

      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
    });

    it('should return 404 for non-existent user', async () => {
      mockDb.update.mockReturnValue(mockDbUpdate([]));

      const response = await request(app)
        .put('/api/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/admin/users/:id/status', () => {
    it('should activate user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updatedUser = { id: userId, isActive: true };
      
      mockDb.update.mockReturnValue(mockDbUpdate([updatedUser]));

      const response = await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.data.user.isActive).toBe(true);
    });

    it('should deactivate user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updatedUser = { id: userId, isActive: false };
      
      mockDb.update.mockReturnValue(mockDbUpdate([updatedUser]));

      const response = await request(app)
        .put(`/api/admin/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.data.user.isActive).toBe(false);
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should get audit logs with pagination', async () => {
      const mockLogs = [
        {
          id: '1',
          action: 'USER_CREATED',
          userId: '123',
          details: 'New user created',
          timestamp: new Date()
        },
        {
          id: '2',
          action: 'USER_UPDATED',
          userId: '456',
          details: 'User profile updated',
          timestamp: new Date()
        }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockLogs));

      const response = await request(app)
        .get('/api/admin/audit-logs?limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toHaveLength(2);
    });

    it('should filter logs by action', async () => {
      const userCreatedLogs = [{ action: 'USER_CREATED' }];
      mockDb.select.mockReturnValue(mockDbSelect(userCreatedLogs));

      const response = await request(app)
        .get('/api/admin/audit-logs?action=USER_CREATED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter logs by date range', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/admin/audit-logs?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/system-stats', () => {
    it('should return system statistics', async () => {
      const mockStats = {
        totalUsers: { count: 150 },
        activeUsers: { count: 140 },
        totalPatients: { count: 2500 },
        totalAppointments: { count: 1200 },
        systemUptime: '15 days',
        storageUsed: '2.5 GB'
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockStats.totalUsers]))
        .mockReturnValueOnce(mockDbSelect([mockStats.activeUsers]))
        .mockReturnValueOnce(mockDbSelect([mockStats.totalPatients]))
        .mockReturnValueOnce(mockDbSelect([mockStats.totalAppointments]));

      const response = await request(app)
        .get('/api/admin/system-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalUsers).toBe(150);
      expect(response.body.data.activeUsers).toBe(140);
    });
  });

  describe('POST /api/admin/facilities', () => {
    it('should create facility successfully', async () => {
      const facilityData = {
        name: 'General Hospital',
        address: '123 Medical Center Dr',
        phone: '+1234567890',
        email: 'info@generalhospital.com',
        type: 'hospital',
        capacity: 200
      };

      const newFacility = { id: 'facility-id', ...facilityData };
      mockDb.insert.mockReturnValue(mockDbInsert([newFacility]));

      const response = await request(app)
        .post('/api/admin/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(facilityData);

      expect(response.status).toBe(201);
      expect(response.body.data.facility.name).toBe(facilityData.name);
    });

    it('should return error for missing required fields', async () => {
      const facilityData = {
        address: '123 Medical Center Dr'
      };

      const response = await request(app)
        .post('/api/admin/facilities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(facilityData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/facilities', () => {
    it('should get all facilities', async () => {
      const mockFacilities = [
        { id: '1', name: 'General Hospital', type: 'hospital' },
        { id: '2', name: 'Clinic A', type: 'clinic' }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockFacilities));

      const response = await request(app)
        .get('/api/admin/facilities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.facilities).toHaveLength(2);
    });

    it('should filter facilities by type', async () => {
      const hospitals = [{ type: 'hospital', name: 'General Hospital' }];
      mockDb.select.mockReturnValue(mockDbSelect(hospitals));

      const response = await request(app)
        .get('/api/admin/facilities?type=hospital')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/admin/facilities/:id', () => {
    it('should update facility successfully', async () => {
      const facilityId = '123e4567-e89b-12d3-a456-426614174001';
      const updateData = {
        name: 'Updated Hospital Name',
        capacity: 250
      };

      const updatedFacility = { id: facilityId, ...updateData };
      mockDb.update.mockReturnValue(mockDbUpdate([updatedFacility]));

      const response = await request(app)
        .put(`/api/admin/facilities/${facilityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.facility.name).toBe(updateData.name);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const mockUser = { id: userId, firstName: 'John' };
      
      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));
      mockDb.delete.mockReturnValue({ where: jest.fn().mockResolvedValue([mockUser]) });

      const response = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .delete('/api/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});