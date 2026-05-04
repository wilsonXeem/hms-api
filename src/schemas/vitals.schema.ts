import { z } from 'zod';

export const vitalsSchema = z.object({
  patientId: z.string().uuid(),
  temperature: z.number().optional(),
  bloodPressureSystolic: z.number().optional(),
  bloodPressureDiastolic: z.number().optional(),
  heartRate: z.number().optional(),
  respiratoryRate: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  recordedBy: z.string().uuid()
});