import { z } from 'zod';

// Common validation patterns
const uuidSchema = z.string().uuid();
const phoneSchema = z.string().regex(/^[+]?[0-9\s-()]+$/, 'Invalid phone format');
const emailSchema = z.string().email();

// Patient validation
export const patientSchema = z.object({
  facilityId: uuidSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female', 'other']),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().max(1000).optional(),
  medicalHistory: z.string().max(2000).optional()
});

// Appointment validation
export const appointmentSchema = z.object({
  facilityId: uuidSchema,
  patientId: uuidSchema,
  doctorId: uuidSchema,
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(500).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled')
});

// Admission validation
export const admissionSchema = z.object({
  facilityId: uuidSchema,
  patientId: uuidSchema,
  doctorId: uuidSchema,
  wardId: uuidSchema.optional(),
  bedId: uuidSchema.optional(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(1000),
  status: z.enum(['active', 'discharged', 'transferred']).default('active')
});

// Lab request validation
export const labRequestSchema = z.object({
  facilityId: uuidSchema,
  patientId: uuidSchema,
  requestedBy: uuidSchema,
  testType: z.string().max(100),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  notes: z.string().max(1000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending')
});

// Prescription validation
export const prescriptionSchema = z.object({
  consultationId: uuidSchema,
  prescribedBy: uuidSchema,
  medications: z.array(z.object({
    drugName: z.string().max(200),
    dosage: z.string().max(100),
    frequency: z.string().max(100),
    duration: z.string().max(100),
    instructions: z.string().max(500).optional()
  })),
  status: z.enum(['active', 'completed', 'cancelled']).default('active')
});

// Inventory validation
export const inventoryItemSchema = z.object({
  facilityId: uuidSchema,
  name: z.string().max(200),
  category: z.string().max(100),
  unit: z.string().max(50),
  minimumStock: z.number().min(0),
  currentStock: z.number().min(0),
  unitPrice: z.number().min(0)
});

// Payment validation
export const paymentSchema = z.object({
  facilityId: uuidSchema,
  patientId: uuidSchema,
  amount: z.number().min(0),
  paymentMethod: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  description: z.string().max(500).optional()
});

// Consultation validation
export const consultationSchema = z.object({
  facilityId: uuidSchema,
  patientId: uuidSchema,
  doctorId: uuidSchema,
  admissionId: uuidSchema.optional(),
  consultationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  diagnosis: z.string().max(1000).optional(),
  treatment: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional()
});

// Bed validation
export const bedSchema = z.object({
  facilityId: uuidSchema,
  wardId: uuidSchema,
  bedNumber: z.string().max(20),
  bedType: z.string().max(50),
  isOccupied: z.boolean().default(false)
});

// Ward validation
export const wardSchema = z.object({
  facilityId: uuidSchema,
  name: z.string().max(100),
  department: z.string().max(100),
  capacity: z.number().min(1),
  currentOccupancy: z.number().min(0).default(0)
});