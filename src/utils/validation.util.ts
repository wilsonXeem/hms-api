import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format');
export const uuidSchema = z.string().uuid('Invalid UUID format');

// User validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  role: z.enum(['admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist'])
});

// Patient validation schemas
export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema.optional(),
  phone: phoneSchema,
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().min(1, 'Address is required'),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: phoneSchema,
    relationship: z.string().min(1, 'Relationship is required')
  })
});

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};