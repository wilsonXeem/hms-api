import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { patients } from '../models/patients.model';
import { vitals } from '../models/vitals.model';
import { patientAllergies } from '../models/patient-allergies.model';
import { patientConditions } from '../models/patient-conditions.model';
import { createMockPatient, mockDbSelect, mockDbInsert, mockDbUpdate, createAuthToken } from './test-helpers';

jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Patient Controller', () => {
  const authToken = createAuthToken({ role: 'doctor' });
  const facilityId = '123e4567-e89b-12d3-a456-426614174001';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/patients', () => {
    it('should create a new patient successfully', async () => {
      const patientData = {
        firstName: 'Jane',
        lastName: 'Smith',
        gender: 'female',
        dob: '1990-01-01',
        phone: '+1234567890',
        address: '123 Main St',
        emergencyContact: 'John Smith',
        bloodGroup: 'O+'
      };

      const newPatient = createMockPatient(patientData);
      mockDb.select.mockReturnValue(mockDbSelect([]));
      mockDb.insert.mockReturnValue(mockDbInsert([newPatient]));

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.firstName).toBe(patientData.firstName);
    });

    it('should return error for missing required fields', async () => {
      const patientData = {
        gender: 'female'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid phone format', async () => {
      const patientData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '123'
      };

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid phone number format');
    });
  });

  describe('GET /api/patients', () => {
    it('should get patients list with pagination', async () => {
      const mockPatients = [createMockPatient(), createMockPatient({ firstName: 'John' })];
      mockDb.select.mockReturnValue(mockDbSelect(mockPatients));

      const response = await request(app)
        .get('/api/patients?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patients).toHaveLength(2);
    });

    it('should search patients by name', async () => {
      const mockPatients = [createMockPatient({ firstName: 'Jane' })];
      mockDb.select.mockReturnValue(mockDbSelect(mockPatients));

      const response = await request(app)
        .get('/api/patients?search=Jane')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.patients).toHaveLength(1);
    });

    it('should filter patients by blood group', async () => {
      const mockPatients = [createMockPatient({ bloodGroup: 'O+' })];
      mockDb.select.mockReturnValue(mockDbSelect(mockPatients));

      const response = await request(app)
        .get('/api/patients?bloodGroup=O+')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.patients).toHaveLength(1);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should get patient by ID', async () => {
      const mockPatient = createMockPatient();
      mockDb.select.mockReturnValue(mockDbSelect([mockPatient]));

      const response = await request(app)
        .get(`/api/patients/${mockPatient.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.patient.id).toBe(mockPatient.id);
    });

    it('should return 404 for non-existent patient', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/patients/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return error for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/patients/123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid patient ID format');
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const updateData = { firstName: 'Updated Name' };
      const updatedPatient = createMockPatient({ ...updateData, id: patientId });
      
      mockDb.update.mockReturnValue(mockDbUpdate([updatedPatient]));

      const response = await request(app)
        .put(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.patient.firstName).toBe(updateData.firstName);
    });

    it('should return error for invalid phone in update', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const updateData = { phone: '123' };

      const response = await request(app)
        .put(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid phone number format');
    });
  });

  describe('POST /api/patients/:id/vitals', () => {
    it('should add patient vitals successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const vitalsData = {
        temperature: 37.5,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 75,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 70,
        height: 175
      };

      const newVitals = { id: 'vitals-id', patientId, ...vitalsData };
      mockDb.insert.mockReturnValue(mockDbInsert([newVitals]));

      const response = await request(app)
        .post(`/api/patients/${patientId}/vitals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(vitalsData);

      expect(response.status).toBe(201);
      expect(response.body.data.vitals.temperature).toBe(vitalsData.temperature);
    });

    it('should detect critical vitals and return alerts', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const criticalVitals = {
        temperature: 39.5,
        bloodPressureSystolic: 190,
        heartRate: 130,
        oxygenSaturation: 85
      };

      const newVitals = { id: 'vitals-id', patientId, ...criticalVitals };
      mockDb.insert.mockReturnValue(mockDbInsert([newVitals]));

      const response = await request(app)
        .post(`/api/patients/${patientId}/vitals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(criticalVitals);

      expect(response.status).toBe(201);
      expect(response.body.data.criticalAlerts).toHaveLength(4);
    });
  });

  describe('POST /api/patients/:id/allergies', () => {
    it('should add patient allergy successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const allergyData = {
        allergen: 'Penicillin',
        severity: 'severe',
        reaction: 'Anaphylaxis',
        notes: 'Immediate reaction'
      };

      const newAllergy = { id: 'allergy-id', patientId, ...allergyData };
      mockDb.insert.mockReturnValue(mockDbInsert([newAllergy]));

      const response = await request(app)
        .post(`/api/patients/${patientId}/allergies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(allergyData);

      expect(response.status).toBe(201);
      expect(response.body.data.allergy.allergen).toBe(allergyData.allergen);
    });

    it('should return error for missing required fields', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const allergyData = { reaction: 'Rash' };

      const response = await request(app)
        .post(`/api/patients/${patientId}/allergies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(allergyData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/patients/:id/conditions', () => {
    it('should add patient condition successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const conditionData = {
        condition: 'Diabetes Type 2',
        diagnosedDate: '2023-01-15',
        status: 'active',
        notes: 'Well controlled'
      };

      const newCondition = { id: 'condition-id', patientId, ...conditionData };
      mockDb.insert.mockReturnValue(mockDbInsert([newCondition]));

      const response = await request(app)
        .post(`/api/patients/${patientId}/conditions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(conditionData);

      expect(response.status).toBe(201);
      expect(response.body.data.condition.condition).toBe(conditionData.condition);
    });
  });

  describe('GET /api/patients/:id/medical-history', () => {
    it('should get complete medical history', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const mockPatient = createMockPatient({ id: patientId });
      const mockAllergies = [{ id: '1', allergen: 'Penicillin' }];
      const mockConditions = [{ id: '1', condition: 'Diabetes' }];
      const mockVitals = [{ id: '1', temperature: 37.0 }];
      const mockConsultations = [{ id: '1', diagnosis: 'Routine checkup' }];

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockPatient]))
        .mockReturnValueOnce(mockDbSelect(mockAllergies))
        .mockReturnValueOnce(mockDbSelect(mockConditions))
        .mockReturnValueOnce(mockDbSelect(mockVitals))
        .mockReturnValueOnce(mockDbSelect(mockConsultations));

      const response = await request(app)
        .get(`/api/patients/${patientId}/medical-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.patient).toBeDefined();
      expect(response.body.data.allergies).toBeDefined();
      expect(response.body.data.conditions).toBeDefined();
      expect(response.body.data.recentVitals).toBeDefined();
      expect(response.body.data.recentConsultations).toBeDefined();
    });
  });

  describe('GET /api/patients/stats', () => {
    it('should get patient statistics', async () => {
      const mockStats = {
        totalPatients: { count: 150 },
        newPatientsThisMonth: { count: 25 },
        genderStats: [{ gender: 'male', count: 75 }, { gender: 'female', count: 75 }],
        bloodGroupStats: [{ bloodGroup: 'O+', count: 50 }]
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockStats.totalPatients]))
        .mockReturnValueOnce(mockDbSelect([mockStats.newPatientsThisMonth]))
        .mockReturnValueOnce(mockDbSelect(mockStats.genderStats))
        .mockReturnValueOnce(mockDbSelect(mockStats.bloodGroupStats));

      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalPatients).toBe(150);
      expect(response.body.data.newPatientsThisMonth).toBe(25);
    });
  });
});