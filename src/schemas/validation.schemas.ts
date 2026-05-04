import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^[+]?[0-9\s-()]{10,15}$/, 'Invalid phone number format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const dateSchema = z.string().datetime('Invalid date format');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist']),
  phone: phoneSchema.optional(),
  department: z.string().max(100).optional(),
  facilityId: uuidSchema.optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});

// Patient schemas
export const createPatientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.string().datetime().optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(500).optional(),
  emergencyContact: z.string().max(200).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional()
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientVitalsSchema = z.object({
  temperature: z.number().min(30).max(45).optional(),
  bloodPressureSystolic: z.number().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().min(30).max(200).optional(),
  heartRate: z.number().min(30).max(200).optional(),
  respiratoryRate: z.number().min(5).max(50).optional(),
  oxygenSaturation: z.number().min(70).max(100).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(30).max(250).optional(),
  notes: z.string().max(1000).optional()
});

// Lab schemas
export const createLabRequestSchema = z.object({
  patientId: uuidSchema,
  testCodes: z.array(z.string()).min(1, 'At least one test required'),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  notes: z.string().max(1000).optional()
});

export const labResultSchema = z.object({
  requestId: uuidSchema,
  testCode: z.string().min(1, 'Test code is required'),
  result: z.string().min(1, 'Result is required'),
  resultValue: z.number().optional(),
  unit: z.string().optional(),
  normalRange: z.string().optional(),
  notes: z.string().max(1000).optional()
});

// Pharmacy schemas
export const dispensationSchema = z.object({
  prescriptionId: uuidSchema,
  items: z.array(z.object({
    drugCode: z.string().min(1, 'Drug code is required'),
    quantityDispensed: z.number().min(0.1, 'Quantity must be positive'),
    batchId: uuidSchema.optional()
  })).min(1, 'At least one item required'),
  patientCounseled: z.boolean().default(false),
  notes: z.string().max(1000).optional()
});

// Inventory schemas
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  category: z.string().min(1, 'Category is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(50),
  minStockLevel: z.number().min(0, 'Minimum stock level must be non-negative'),
  maxStockLevel: z.number().min(0, 'Maximum stock level must be non-negative'),
  description: z.string().max(1000).optional()
});

export const addStockBatchSchema = z.object({
  itemId: uuidSchema,
  batchNumber: z.string().min(1, 'Batch number is required').max(100),
  quantity: z.number().min(0.1, 'Quantity must be positive'),
  expiryDate: z.string().datetime(),
  costPrice: z.number().min(0, 'Cost price must be non-negative'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  supplier: z.string().max(200).optional()
});

// Appointment schemas
export const createAppointmentSchema = z.object({
  patientId: uuidSchema,
  doctorId: uuidSchema,
  appointmentDate: z.string().datetime(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration: z.number().min(15).max(480).default(30),
  type: z.enum(['consultation', 'follow_up', 'emergency', 'routine']).default('consultation'),
  notes: z.string().max(1000).optional()
});

// Payment schemas
export const createPaymentSchema = z.object({
  patientId: uuidSchema,
  amount: z.number().min(0.01, 'Amount must be positive'),
  paymentMethod: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  description: z.string().min(1, 'Description is required').max(500),
  referenceNumber: z.string().max(100).optional()
});

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const searchSchema = z.object({
  search: z.string().max(100).optional(),
  ...paginationSchema.shape
});

// Admin schemas
export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist', 'accountant', 'inventory_manager', 'staff']),
  phone: phoneSchema.optional(),
  department: z.string().max(100).optional()
});

export const updateUserSchema = createUserSchema.omit({ password: true }).partial();

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default([])
});

export const updateRoleSchema = createRoleSchema.partial();

export const createFacilitySchema = z.object({
  tenantId: uuidSchema.optional(),
  name: z.string().min(1, 'Facility name is required').max(150),
  type: z.enum(['hospital', 'clinic', 'diagnostic_center', 'pharmacy', 'warehouse']).optional(),
  address: z.string().max(255).optional(),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneSchema.optional(),
  description: z.string().max(1000).optional(),
  mission: z.string().max(1000).optional(),
  vision: z.string().max(1000).optional(),
  services: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional(),
  emergencyContact: phoneSchema.optional(),
  website: z.string().url('Invalid website URL').optional()
});

export const updateFacilitySchema = createFacilitySchema.partial();

export const contactDetailsSchema = z.object({
  contactPhone: phoneSchema.optional(),
  contactEmail: emailSchema.optional(),
  address: z.string().max(255).optional(),
  emergencyContact: phoneSchema.optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional()
});

export const facilitySettingsSchema = z.object({
  name: z.string().min(1, 'Facility name is required').max(150).optional(),
  type: z.enum(['hospital', 'clinic', 'diagnostic_center', 'pharmacy', 'warehouse']).optional(),
  address: z.string().max(255).optional(),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneSchema.optional(),
  description: z.string().max(1000).optional(),
  mission: z.string().max(1000).optional(),
  vision: z.string().max(1000).optional(),
  services: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional()
  }).optional(),
  emergencyContact: phoneSchema.optional(),
  website: z.string().url('Invalid website URL').optional()
});

// Onboarding schemas
export const hospitalInfoSchema = z.object({
  name: z.string().min(1, 'Hospital name is required').max(150),
  description: z.string().max(1000).optional(),
  contactPhone: phoneSchema.optional(),
  contactEmail: emailSchema.optional(),
  address: z.string().max(255).optional(),
  website: z.string().url('Invalid website URL').optional()
});

export const aboutContentSchema = z.object({
  aboutContent: z.string().min(1, 'About content is required').max(5000),
  mission: z.string().max(1000).optional(),
  vision: z.string().max(1000).optional()
});

export const servicesSchema = z.object({
  servicesOffered: z.array(z.object({
    name: z.string().min(1, 'Service name is required').max(100),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional()
  })).min(1, 'At least one service is required')
});

export const logoUploadSchema = z.object({
  logoUrl: z.string().url('Invalid logo URL').max(255)
});

export const socialMediaSchema = z.object({
  socialMediaLinks: z.object({
    facebook: z.string().url('Invalid Facebook URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    instagram: z.string().url('Invalid Instagram URL').optional(),
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    youtube: z.string().url('Invalid YouTube URL').optional()
  }).optional()
});
