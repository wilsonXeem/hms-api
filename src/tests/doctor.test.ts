import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { consultations } from '../models/consultations.model';
import { prescriptions } from '../models/prescriptions.model';
import { appointments } from '../models/appointments.model';
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

describe('Doctor Controller', () => {
  const doctorToken = createAuthToken({ role: 'doctor' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/doctor/consultations', () => {
    it('should create consultation successfully', async () => {
      const consultationData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        appointmentId: '123e4567-e89b-12d3-a456-426614174007',
        chiefComplaint: 'Chest pain',
        historyOfPresentIllness: 'Patient reports chest pain for 2 days',
        physicalExamination: 'Normal heart sounds, no murmurs',
        diagnosis: 'Chest wall pain',
        treatmentPlan: 'Rest and pain medication',
        followUpInstructions: 'Return if symptoms worsen'
      };

      const newConsultation = { id: 'consultation-id', ...consultationData };
      mockDb.insert.mockReturnValue(mockDbInsert([newConsultation]));

      const response = await request(app)
        .post('/api/doctor/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(consultationData);

      expect(response.status).toBe(201);
      expect(response.body.data.consultation.diagnosis).toBe(consultationData.diagnosis);
    });

    it('should return error for missing required fields', async () => {
      const consultationData = {
        chiefComplaint: 'Chest pain'
      };

      const response = await request(app)
        .post('/api/doctor/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(consultationData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/doctor/prescriptions', () => {
    it('should create prescription successfully', async () => {
      const prescriptionData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        consultationId: '123e4567-e89b-12d3-a456-426614174008',
        medications: [
          {
            drugName: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'TID',
            duration: '5 days',
            quantity: 15,
            instructions: 'Take with food'
          }
        ],
        notes: 'Monitor for stomach upset'
      };

      const newPrescription = { id: 'prescription-id', ...prescriptionData };
      mockDb.insert.mockReturnValue(mockDbInsert([newPrescription]));

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(prescriptionData);

      expect(response.status).toBe(201);
      expect(response.body.data.prescription.medications).toHaveLength(1);
    });

    it('should validate medication data', async () => {
      const prescriptionData = {
        patientId: '123e4567-e89b-12d3-a456-426614174002',
        medications: [
          {
            drugName: 'Ibuprofen',
            dosage: '400mg'
            // Missing required fields
          }
        ]
      };

      const response = await request(app)
        .post('/api/doctor/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(prescriptionData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/doctor/appointments', () => {
    it('should get doctor appointments', async () => {
      const mockAppointments = [
        {
          id: '1',
          patientName: 'John Doe',
          appointmentDate: new Date(),
          status: 'scheduled',
          type: 'consultation'
        }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockAppointments));

      const response = await request(app)
        .get('/api/doctor/appointments')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.appointments).toHaveLength(1);
    });

    it('should filter appointments by date', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/doctor/appointments?date=2024-01-15')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter appointments by status', async () => {
      const scheduledAppointments = [{ status: 'scheduled' }];
      mockDb.select.mockReturnValue(mockDbSelect(scheduledAppointments));

      const response = await request(app)
        .get('/api/doctor/appointments?status=scheduled')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/doctor/appointments/:id/status', () => {
    it('should update appointment status', async () => {
      const appointmentId = '123e4567-e89b-12d3-a456-426614174007';
      const updatedAppointment = {
        id: appointmentId,
        status: 'completed',
        completedAt: new Date()
      };

      mockDb.update.mockReturnValue(mockDbUpdate([updatedAppointment]));

      const response = await request(app)
        .put(`/api/doctor/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.data.appointment.status).toBe('completed');
    });

    it('should return error for invalid status', async () => {
      const appointmentId = '123e4567-e89b-12d3-a456-426614174007';

      const response = await request(app)
        .put(`/api/doctor/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/doctor/patients/:id/history', () => {
    it('should get patient medical history', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174002';
      const mockHistory = {
        consultations: [{ diagnosis: 'Hypertension' }],
        prescriptions: [{ drugName: 'Lisinopril' }],
        labResults: [{ testName: 'CBC', result: 'Normal' }],
        allergies: [{ allergen: 'Penicillin' }]
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect(mockHistory.consultations))
        .mockReturnValueOnce(mockDbSelect(mockHistory.prescriptions))
        .mockReturnValueOnce(mockDbSelect(mockHistory.labResults))
        .mockReturnValueOnce(mockDbSelect(mockHistory.allergies));

      const response = await request(app)
        .get(`/api/doctor/patients/${patientId}/history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.consultations).toBeDefined();
      expect(response.body.data.prescriptions).toBeDefined();
    });
  });

  describe('GET /api/doctor/dashboard', () => {
    it('should get doctor dashboard data', async () => {
      const mockDashboard = {
        todayAppointments: { count: 8 },
        pendingConsultations: { count: 3 },
        totalPatients: { count: 150 },
        upcomingAppointments: [
          {
            id: '1',
            patientName: 'John Doe',
            appointmentTime: new Date()
          }
        ]
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockDashboard.todayAppointments]))
        .mockReturnValueOnce(mockDbSelect([mockDashboard.pendingConsultations]))
        .mockReturnValueOnce(mockDbSelect([mockDashboard.totalPatients]))
        .mockReturnValueOnce(mockDbSelect(mockDashboard.upcomingAppointments));

      const response = await request(app)
        .get('/api/doctor/dashboard')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.todayAppointments).toBe(8);
      expect(response.body.data.upcomingAppointments).toHaveLength(1);
    });
  });
});