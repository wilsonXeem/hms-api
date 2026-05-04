import { z } from 'zod';

export const userSchema = z.object({
  facilityId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(150),
  passwordHash: z.string().min(8).max(255),
  role: z.string().max(50),
  phone: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  preferences: z.record(z.any()).default({}),
  notificationSettings: z.record(z.any()).default({}),
  securitySettings: z.record(z.any()).default({})
});