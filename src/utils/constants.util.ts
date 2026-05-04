// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  LAB_TECH: 'lab_tech',
  RECEPTIONIST: 'receptionist'
} as const;

// Patient status
export const PATIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCHARGED: 'discharged'
} as const;

// Admission status
export const ADMISSION_STATUS = {
  ADMITTED: 'admitted',
  DISCHARGED: 'discharged',
  TRANSFERRED: 'transferred'
} as const;

// Admission types
export const ADMISSION_TYPES = {
  INPATIENT: 'inpatient',
  OUTPATIENT: 'outpatient',
  EMERGENCY: 'emergency',
  DAY_CARE: 'day_care'
} as const;

// Bed types
export const BED_TYPES = {
  GENERAL: 'general',
  ICU: 'icu',
  ISOLATION: 'isolation',
  PRIVATE: 'private'
} as const;

// Ward types
export const WARD_TYPES = {
  GENERAL: 'general',
  ICU: 'icu',
  EMERGENCY: 'emergency',
  MATERNITY: 'maternity',
  PEDIATRIC: 'pediatric',
  SURGERY: 'surgery'
} as const;

// Appointment status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
} as const;

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

// Lab test status
export const LAB_TEST_STATUS = {
  REQUESTED: 'requested',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// Prescription status
export const PRESCRIPTION_STATUS = {
  ACTIVE: 'active',
  DISPENSED: 'dispensed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
} as const;

// Inventory status
export const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  EXPIRED: 'expired'
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  DUPLICATE_ENTRY: 'Resource already exists'
} as const;