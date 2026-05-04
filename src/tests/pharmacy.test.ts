import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { prescriptions } from '../models/prescriptions.model';
import { dispensations } from '../models/dispensations.model';
import { drugCatalog } from '../models/drug-catalog.model';
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

describe('Pharmacy Controller', () => {
  const pharmacistToken = createAuthToken({ role: 'pharmacist' });
  const doctorToken = createAuthToken({ role: 'doctor' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pharmacy/dispense', () => {
    it('should dispense medication successfully', async () => {
      const dispensationData = {
        prescriptionId: '123e4567-e89b-12d3-a456-426614174005',
        items: [{
          medicationId: '456e7890-e89b-12d3-a456-426614174006',
          quantity: 30,
          instructions: 'Take twice daily after meals',
          dosage: '500mg'
        }],
        patientCounseling: 'Patient counseled on proper usage',
        pharmacistNotes: 'No drug interactions found'
      };

      const mockPrescription = {
        id: dispensationData.prescriptionId,
        status: 'pending',
        patientId: '123e4567-e89b-12d3-a456-426614174002'
      };
      
      const newDispensation = {
        id: 'dispensation-id',
        ...dispensationData,
        dispensedAt: new Date(),
        dispensedBy: '123e4567-e89b-12d3-a456-426614174000'
      };

      mockDb.select.mockReturnValue(mockDbSelect([mockPrescription]));
      mockDb.insert.mockReturnValue(mockDbInsert([newDispensation]));
      mockDb.update.mockReturnValue(mockDbUpdate([{ ...mockPrescription, status: 'dispensed' }]));

      const response = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send(dispensationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.dispensation.items).toHaveLength(1);
    });

    it('should return error for missing prescription ID', async () => {
      const dispensationData = {
        items: [{
          medicationId: '456',
          quantity: 30
        }]
      };

      const response = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send(dispensationData);

      expect(response.status).toBe(400);
    });

    it('should return error for already dispensed prescription', async () => {
      const dispensationData = {
        prescriptionId: '123e4567-e89b-12d3-a456-426614174005',
        items: [{ medicationId: '456', quantity: 30 }]
      };

      const mockPrescription = {
        id: dispensationData.prescriptionId,
        status: 'dispensed'
      };

      mockDb.select.mockReturnValue(mockDbSelect([mockPrescription]));

      const response = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send(dispensationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already dispensed');
    });

    it('should check drug interactions and allergies', async () => {
      const dispensationData = {
        prescriptionId: '123e4567-e89b-12d3-a456-426614174005',
        items: [{
          medicationId: '456e7890-e89b-12d3-a456-426614174006',
          quantity: 30,
          drugName: 'Penicillin'
        }]
      };

      const mockPrescription = {
        id: dispensationData.prescriptionId,
        status: 'pending',
        patientId: '123e4567-e89b-12d3-a456-426614174002'
      };

      const mockAllergies = [{ allergen: 'Penicillin', severity: 'severe' }];

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockPrescription]))
        .mockReturnValueOnce(mockDbSelect(mockAllergies));

      const response = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send(dispensationData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('allergy');
    });
  });

  describe('GET /api/pharmacy/prescriptions/pending', () => {
    it('should get pending prescriptions', async () => {
      const mockPrescriptions = [
        {
          id: '1',
          patientName: 'John Doe',
          doctorName: 'Dr. Smith',
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: '2',
          patientName: 'Jane Smith',
          doctorName: 'Dr. Johnson',
          status: 'pending',
          createdAt: new Date()
        }
      ];
      
      mockDb.select.mockReturnValue(mockDbSelect(mockPrescriptions));

      const response = await request(app)
        .get('/api/pharmacy/prescriptions/pending')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.prescriptions).toHaveLength(2);
    });

    it('should filter by priority', async () => {
      const urgentPrescriptions = [{
        id: '1',
        priority: 'urgent',
        status: 'pending'
      }];
      
      mockDb.select.mockReturnValue(mockDbSelect(urgentPrescriptions));

      const response = await request(app)
        .get('/api/pharmacy/prescriptions/pending?priority=urgent')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.prescriptions).toHaveLength(1);
    });
  });

  describe('GET /api/pharmacy/prescriptions/:id', () => {
    it('should get prescription details', async () => {
      const prescriptionId = '123e4567-e89b-12d3-a456-426614174005';
      const mockPrescription = {
        id: prescriptionId,
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        medications: [
          {
            drugName: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'TID',
            duration: '7 days',
            quantity: 21
          }
        ],
        status: 'pending'
      };
      
      mockDb.select.mockReturnValue(mockDbSelect([mockPrescription]));

      const response = await request(app)
        .get(`/api/pharmacy/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.prescription.id).toBe(prescriptionId);
    });

    it('should return 404 for non-existent prescription', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/pharmacy/prescriptions/non-existent-id')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/pharmacy/prescriptions/:id/verify', () => {
    it('should verify prescription successfully', async () => {
      const prescriptionId = '123e4567-e89b-12d3-a456-426614174005';
      const verificationData = {
        verificationNotes: 'Prescription verified, no issues found',
        drugInteractions: [],
        allergyChecked: true
      };

      const mockPrescription = {
        id: prescriptionId,
        status: 'pending'
      };

      const updatedPrescription = {
        ...mockPrescription,
        status: 'verified',
        verifiedBy: '123e4567-e89b-12d3-a456-426614174000',
        verifiedAt: new Date()
      };

      mockDb.select.mockReturnValue(mockDbSelect([mockPrescription]));
      mockDb.update.mockReturnValue(mockDbUpdate([updatedPrescription]));

      const response = await request(app)
        .post(`/api/pharmacy/prescriptions/${prescriptionId}/verify`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send(verificationData);

      expect(response.status).toBe(200);
      expect(response.body.data.prescription.status).toBe('verified');
    });

    it('should return error for already verified prescription', async () => {
      const prescriptionId = '123e4567-e89b-12d3-a456-426614174005';
      const mockPrescription = {
        id: prescriptionId,
        status: 'verified'
      };

      mockDb.select.mockReturnValue(mockDbSelect([mockPrescription]));

      const response = await request(app)
        .post(`/api/pharmacy/prescriptions/${prescriptionId}/verify`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pharmacy/drug-catalog', () => {
    it('should get drug catalog', async () => {
      const mockDrugs = [
        {
          id: '1',
          drugName: 'Amoxicillin',
          genericName: 'Amoxicillin',
          category: 'Antibiotic',
          strength: '500mg',
          dosageForm: 'Capsule'
        },
        {
          id: '2',
          drugName: 'Paracetamol',
          genericName: 'Acetaminophen',
          category: 'Analgesic',
          strength: '500mg',
          dosageForm: 'Tablet'
        }
      ];
      
      mockDb.select.mockReturnValue(mockDbSelect(mockDrugs));

      const response = await request(app)
        .get('/api/pharmacy/drug-catalog')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.drugs).toHaveLength(2);
    });

    it('should search drugs by name', async () => {
      const mockDrugs = [{
        drugName: 'Amoxicillin',
        category: 'Antibiotic'
      }];
      
      mockDb.select.mockReturnValue(mockDbSelect(mockDrugs));

      const response = await request(app)
        .get('/api/pharmacy/drug-catalog?search=Amox')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.drugs).toHaveLength(1);
    });
  });

  describe('GET /api/pharmacy/dispensations', () => {
    it('should get dispensation history', async () => {
      const mockDispensations = [
        {
          id: '1',
          prescriptionId: '123',
          patientName: 'John Doe',
          dispensedAt: new Date(),
          dispensedBy: 'Pharmacist Smith'
        }
      ];
      
      mockDb.select.mockReturnValue(mockDbSelect(mockDispensations));

      const response = await request(app)
        .get('/api/pharmacy/dispensations')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.dispensations).toHaveLength(1);
    });

    it('should filter by date range', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/pharmacy/dispensations?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/pharmacy/stats', () => {
    it('should return pharmacy statistics', async () => {
      const mockStats = {
        pendingPrescriptions: { count: 25 },
        dispensedToday: { count: 15 },
        totalDispensations: { count: 500 },
        criticalStock: { count: 8 }
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockStats.pendingPrescriptions]))
        .mockReturnValueOnce(mockDbSelect([mockStats.dispensedToday]))
        .mockReturnValueOnce(mockDbSelect([mockStats.totalDispensations]))
        .mockReturnValueOnce(mockDbSelect([mockStats.criticalStock]));

      const response = await request(app)
        .get('/api/pharmacy/stats')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pendingPrescriptions).toBe(25);
      expect(response.body.data.dispensedToday).toBe(15);
    });
  });
});