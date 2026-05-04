import { z } from 'zod';

export const roleSchema = z.object({
  facilityId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default([]),
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true)
});