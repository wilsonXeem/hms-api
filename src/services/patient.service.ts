import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { patients } from '../models/patients.model';
import { patientAllergies } from '../models/patient-allergies.model';
import { patientConditions } from '../models/patient-conditions.model';
import { vitals } from '../models/vitals.model';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError } from '../utils/errors.util';

export class PatientService {
  static async getPatientSummary(patientId: string, facilityId: string) {
    try {
      const [patient] = await db.select()
        .from(patients)
        .where(and(
          eq(patients.id, patientId),
          eq(patients.facilityId, facilityId)
        ))
        .limit(1);

      if (!patient) {
        throw new NotFoundError('Patient');
      }

      const [allergies, conditions, latestVitals] = await Promise.all([
        db.select().from(patientAllergies).where(eq(patientAllergies.patientId, patientId)),
        db.select().from(patientConditions).where(eq(patientConditions.patientId, patientId)),
        db.select().from(vitals).where(eq(vitals.patientId, patientId)).limit(1)
      ]);

      return {
        patient,
        allergies,
        conditions,
        latestVitals: latestVitals[0] || null
      };
    } catch (error) {
      logger.error('Get patient summary error:', error);
      throw error;
    }
  }

  static async validatePatientAccess(patientId: string, facilityId: string): Promise<boolean> {
    try {
      const [patient] = await db.select()
        .from(patients)
        .where(and(
          eq(patients.id, patientId),
          eq(patients.facilityId, facilityId)
        ))
        .limit(1);

      return !!patient;
    } catch (error) {
      logger.error('Validate patient access error:', error);
      return false;
    }
  }

  static async addAllergy(patientId: string, allergyData: any) {
    try {
      const [allergy] = await db.insert(patientAllergies)
        .values({
          patientId,
          ...allergyData
        })
        .returning();

      logger.info(`Allergy added for patient: ${patientId}`);
      return allergy;
    } catch (error) {
      logger.error('Add patient allergy error:', error);
      throw error;
    }
  }

  static async addCondition(patientId: string, conditionData: any) {
    try {
      const [condition] = await db.insert(patientConditions)
        .values({
          patientId,
          ...conditionData
        })
        .returning();

      logger.info(`Condition added for patient: ${patientId}`);
      return condition;
    } catch (error) {
      logger.error('Add patient condition error:', error);
      throw error;
    }
  }
}