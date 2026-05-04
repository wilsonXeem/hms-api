import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { admissions } from '../models/admissions.model';
import { patients } from '../models/patients.model';
import { beds } from '../models/beds.model';
import { wards } from '../models/wards.model';
import { users } from '../models/users.model';
import { consultations } from '../models/consultations.model';
import { roomCharges } from '../models/room-charges.model';
import { auditService } from './audit.service';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.util';

export interface AdmissionData {
  patientId: string;
  admissionType: 'inpatient' | 'outpatient' | 'emergency' | 'day_care';
  bedId?: string;
  wardId?: string;
  admittingDoctorId: string;
  admissionReason?: string;
}

export interface DischargeData {
  dischargingDoctorId: string;
  dischargeReason?: string;
  dischargeSummary?: string;
}

export class AdmissionService {
  static async createAdmission(facilityId: string, admissionData: AdmissionData, userId: string, ipAddress: string) {
    try {
      // Validate patient exists
      const [patient] = await db.select()
        .from(patients)
        .where(and(eq(patients.id, admissionData.patientId), eq(patients.facilityId, facilityId)))
        .limit(1);

      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      // Check for active admission
      const [activeAdmission] = await db.select()
        .from(admissions)
        .where(and(
          eq(admissions.patientId, admissionData.patientId),
          eq(admissions.status, 'admitted')
        ))
        .limit(1);

      if (activeAdmission) {
        throw new ConflictError('Patient already has an active admission');
      }

      // Validate and allocate bed if specified
      if (admissionData.bedId) {
        const bedAllocation = await this.allocateBed(admissionData.bedId, facilityId);
        if (!bedAllocation.success) {
          throw new ValidationError(bedAllocation.message);
        }
      }

      // Generate admission number
      const admissionNumber = await this.generateAdmissionNumber();

      // Create admission
      const [newAdmission] = await db.insert(admissions).values({
        facilityId,
        patientId: admissionData.patientId,
        admissionNumber,
        admissionType: admissionData.admissionType,
        admissionDate: new Date(),
        bedId: admissionData.bedId || null,
        wardId: admissionData.wardId || null,
        admittingDoctorId: admissionData.admittingDoctorId,
        admissionReason: admissionData.admissionReason,
        status: 'admitted'
      } as any).returning();

      // Audit log
      await auditService.log({
        userId,
        action: 'ADMISSION_CREATED',
        resource: 'admission',
        resourceId: newAdmission.id,
        details: {
          patientId: admissionData.patientId,
          admissionNumber,
          admissionType: admissionData.admissionType,
          bedId: admissionData.bedId
        },
        ipAddress,
        facilityId,
        severity: 'medium'
      });

      logger.info(`Admission created: ${admissionNumber} for patient ${admissionData.patientId}`);
      return newAdmission;
    } catch (error) {
      logger.error('Create admission error:', error);
      throw error;
    }
  }

  static async dischargePatient(admissionId: string, facilityId: string, dischargeData: DischargeData, userId: string, ipAddress: string) {
    try {
      // Get active admission
      const [admission] = await db.select()
        .from(admissions)
        .where(and(
          eq(admissions.id, admissionId),
          eq(admissions.facilityId, facilityId),
          eq(admissions.status, 'admitted')
        ))
        .limit(1);

      if (!admission) {
        throw new NotFoundError('Active admission not found');
      }

      // Update admission
      const [updatedAdmission] = await db.update(admissions)
        .set({
          status: 'discharged',
          dischargeDate: new Date(),
          dischargingDoctorId: dischargeData.dischargingDoctorId,
          dischargeReason: dischargeData.dischargeReason,
          dischargeSummary: dischargeData.dischargeSummary,
          updatedAt: new Date()
        })
        .where(eq(admissions.id, admissionId))
        .returning();

      // Free bed if allocated
      if (admission.bedId) {
        await this.freeBed(admission.bedId);
      }

      // Audit log
      await auditService.log({
        userId,
        action: 'PATIENT_DISCHARGED',
        resource: 'admission',
        resourceId: admissionId,
        details: {
          patientId: admission.patientId,
          admissionNumber: admission.admissionNumber,
          dischargeReason: dischargeData.dischargeReason
        },
        ipAddress,
        facilityId,
        severity: 'medium'
      });

      logger.info(`Patient discharged: ${admission.admissionNumber}`);
      return updatedAdmission;
    } catch (error) {
      logger.error('Discharge patient error:', error);
      throw error;
    }
  }

  static async getAdmissionDetails(admissionId: string, facilityId: string) {
    try {
      const [admission] = await db.select({
        id: admissions.id,
        admissionNumber: admissions.admissionNumber,
        admissionType: admissions.admissionType,
        admissionDate: sql<string>`to_char(${admissions.admissionDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        dischargeDate: sql<string>`to_char(${admissions.dischargeDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        status: admissions.status,
        priority: admissions.priority,
        admissionReason: admissions.admissionReason,
        dischargeReason: admissions.dischargeReason,
        dischargeSummary: admissions.dischargeSummary,
        totalCharges: admissions.totalCharges,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        patientCode: patients.patientCode,
        patientGender: patients.gender,
        wardName: wards.name,
        wardCode: wards.code,
        bedId: admissions.bedId,
        bedNumber: sql<string>`${beds.bedNumber}`,
        admittingDoctorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`
      })
      .from(admissions)
      .leftJoin(patients, eq(admissions.patientId, patients.id))
      .leftJoin(wards, eq(admissions.wardId, wards.id))
      .leftJoin(beds, eq(admissions.bedId, beds.id))
      .leftJoin(users, eq(admissions.admittingDoctorId, users.id))
      .where(and(
        eq(admissions.id, admissionId),
        eq(admissions.facilityId, facilityId)
      ))
      .limit(1);

      if (!admission) {
        throw new NotFoundError('Admission not found');
      }

      return admission;
    } catch (error) {
      logger.error('Get admission details error:', error);
      throw error;
    }
  }

  static async getActiveAdmissions(facilityId: string, limit: number = 50, offset: number = 0, patientId?: string, status?: string) {
    try {
      const conditions: any[] = [eq(admissions.facilityId, facilityId)];
      if (patientId) conditions.push(eq(admissions.patientId, patientId));
      if (status) conditions.push(eq(admissions.status, status));

      const admissionList = await db.select({
        id: admissions.id,
        admissionNumber: admissions.admissionNumber,
        admissionType: admissions.admissionType,
        admissionDate: sql<string>`to_char(${admissions.admissionDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        dischargeDate: sql<string>`to_char(${admissions.dischargeDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        status: admissions.status,
        priority: admissions.priority,
        patientId: admissions.patientId,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        patientCode: patients.patientCode,
        wardName: wards.name,
        bedNumber: beds.bedNumber,
        admissionReason: admissions.admissionReason,
        totalCharges: admissions.totalCharges
      })
      .from(admissions)
      .leftJoin(patients, eq(admissions.patientId, patients.id))
      .leftJoin(wards, eq(admissions.wardId, wards.id))
      .leftJoin(beds, eq(admissions.bedId, beds.id))
      .where(and(...conditions))
      .orderBy(desc(admissions.admissionDate))
      .limit(limit)
      .offset(offset);

      return admissionList;
    } catch (error) {
      logger.error('Get active admissions error:', error);
      throw error;
    }
  }

  static async getAdmissionStats(facilityId: string) {
    try {
      const [totalAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(eq(admissions.facilityId, facilityId));

      const [activeAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          eq(admissions.status, 'admitted')
        ));

      const [todayAdmissions] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          sql`DATE(${admissions.admissionDate}) = CURRENT_DATE`
        ));

      const [todayDischarges] = await db.select({ count: sql<number>`count(*)` })
        .from(admissions)
        .where(and(
          eq(admissions.facilityId, facilityId),
          sql`DATE(${admissions.dischargeDate}) = CURRENT_DATE`
        ));

      return {
        totalAdmissions: totalAdmissions.count,
        activeAdmissions: activeAdmissions.count,
        todayAdmissions: todayAdmissions.count,
        todayDischarges: todayDischarges.count
      };
    } catch (error) {
      logger.error('Get admission stats error:', error);
      throw error;
    }
  }

  static async transferPatient(admissionId: string, facilityId: string, newBedId: string, newWardId: string, userId: string, ipAddress: string) {
    try {
      const [admission] = await db.select()
        .from(admissions)
        .where(and(
          eq(admissions.id, admissionId),
          eq(admissions.facilityId, facilityId),
          eq(admissions.status, 'admitted')
        ))
        .limit(1);

      if (!admission) {
        throw new NotFoundError('Active admission not found');
      }

      // Free current bed
      if (admission.bedId) {
        await this.freeBed(admission.bedId);
      }

      // Allocate new bed
      const bedAllocation = await this.allocateBed(newBedId, facilityId);
      if (!bedAllocation.success) {
        throw new ValidationError(bedAllocation.message);
      }

      // Update admission
      const [updatedAdmission] = await db.update(admissions)
        .set({
          bedId: newBedId,
          wardId: newWardId,
          updatedAt: new Date()
        })
        .where(eq(admissions.id, admissionId))
        .returning();

      // Audit log
      await auditService.log({
        userId,
        action: 'PATIENT_TRANSFERRED',
        resource: 'admission',
        resourceId: admissionId,
        details: {
          fromBedId: admission.bedId,
          toBedId: newBedId,
          fromWardId: admission.wardId,
          toWardId: newWardId
        },
        ipAddress,
        facilityId,
        severity: 'medium'
      });

      return updatedAdmission;
    } catch (error) {
      logger.error('Transfer patient error:', error);
      throw error;
    }
  }

  private static async allocateBed(bedId: string, facilityId: string) {
    try {
      const [bed] = await db.select()
        .from(beds)
        .where(and(eq(beds.id, bedId), eq(beds.facilityId, facilityId)))
        .limit(1);

      if (!bed) {
        return { success: false, message: 'Bed not found' };
      }

      if (bed.isOccupied) {
        return { success: false, message: 'Bed is not available' };
      }

      await db.update(beds).set({ isOccupied: true }).where(eq(beds.id, bedId));
      return { success: true, message: 'Bed allocated successfully' };
    } catch (error) {
      logger.error('Allocate bed error:', error);
      return { success: false, message: 'Failed to allocate bed' };
    }
  }

  private static async freeBed(bedId: string) {
    try {
      await db.update(beds).set({ isOccupied: false }).where(eq(beds.id, bedId));
      logger.info(`Bed freed: ${bedId}`);
    } catch (error) {
      logger.error('Free bed error:', error);
    }
  }

  static async getInpatientConsultations(admissionId: string, facilityId: string) {
    try {
      const consultationList = await db.select({
        id: consultations.id,
        consultationDate: consultations.consultationDate,
        diagnosis: consultations.diagnosis,
        notes: consultations.notes,
        status: consultations.status,
        doctor: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(consultations)
      .leftJoin(users, eq(consultations.doctorId, users.id))
      .where(and(
        eq(consultations.admissionId, admissionId),
        eq(consultations.facilityId, facilityId),
        eq(consultations.consultationType, 'inpatient')
      ))
      .orderBy(desc(consultations.consultationDate));

      return consultationList;
    } catch (error) {
      logger.error('Get inpatient consultations error:', error);
      throw error;
    }
  }

  static async createInpatientConsultation(
    admissionId: string, 
    facilityId: string, 
    consultationData: { doctorId: string; diagnosis?: string; notes?: string }, 
    userId: string
  ) {
    try {
      // Verify admission exists and is active
      const [admission] = await db.select()
        .from(admissions)
        .where(and(
          eq(admissions.id, admissionId),
          eq(admissions.facilityId, facilityId),
          eq(admissions.status, 'admitted')
        ))
        .limit(1);

      if (!admission) {
        throw new NotFoundError('Active admission not found');
      }

      // Create consultation
      const [newConsultation] = await db.insert(consultations).values({
        facilityId,
        patientId: admission.patientId,
        doctorId: consultationData.doctorId,
        admissionId,
        consultationType: 'inpatient',
        diagnosis: consultationData.diagnosis,
        notes: consultationData.notes,
        status: 'completed'
      } as any).returning();

      // Audit log
      await auditService.log({
        userId,
        action: 'INPATIENT_CONSULTATION_CREATED',
        resource: 'consultation',
        resourceId: newConsultation.id,
        details: {
          admissionId,
          patientId: admission.patientId,
          doctorId: consultationData.doctorId
        },
        facilityId,
        severity: 'medium'
      });

      return newConsultation;
    } catch (error) {
      logger.error('Create inpatient consultation error:', error);
      throw error;
    }
  }

  static async calculateRoomCharges(admissionId: string, facilityId: string) {
    try {
      const [admission] = await db.select()
        .from(admissions)
        .where(and(
          eq(admissions.id, admissionId),
          eq(admissions.facilityId, facilityId)
        ))
        .limit(1);

      if (!admission) {
        throw new NotFoundError('Admission not found');
      }

      const admissionDate = new Date(admission.admissionDate);
      const endDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
      const daysDiff = Math.ceil((endDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get bed/ward rates (simplified - using fixed rates for v1.0)
      const dailyRate = admission.bedId ? 150.00 : 100.00; // $150 for bed, $100 for ward only
      const totalAmount = dailyRate * daysDiff;

      return {
        admissionId,
        numberOfDays: daysDiff,
        dailyRate,
        totalAmount,
        bedId: admission.bedId,
        wardId: admission.wardId
      };
    } catch (error) {
      logger.error('Calculate room charges error:', error);
      throw error;
    }
  }

  static async createRoomCharges(admissionId: string, facilityId: string, userId: string) {
    try {
      const chargeData = await this.calculateRoomCharges(admissionId, facilityId);
      
      // Check if charges already exist
      const [existingCharge] = await db.select()
        .from(roomCharges)
        .where(and(
          eq(roomCharges.admissionId, admissionId),
          eq(roomCharges.isActive, true)
        ))
        .limit(1);

      if (existingCharge) {
        // Update existing charge
        const [updatedCharge] = await db.update(roomCharges)
          .set({
            numberOfDays: chargeData.numberOfDays.toString(),
            totalAmount: chargeData.totalAmount.toString(),
            updatedAt: new Date()
          })
          .where(eq(roomCharges.id, existingCharge.id))
          .returning();

        return updatedCharge;
      } else {
        // Create new charge
        const [newCharge] = await db.insert(roomCharges).values({
          facilityId,
          admissionId,
          bedId: chargeData.bedId,
          wardId: chargeData.wardId,
          dailyRate: chargeData.dailyRate.toString(),
          numberOfDays: chargeData.numberOfDays.toString(),
          totalAmount: chargeData.totalAmount.toString(),
          chargeType: chargeData.bedId ? 'bed' : 'ward',
          status: 'pending'
        } as any).returning();

        // Update admission total charges
        await db.update(admissions)
          .set({ 
            totalCharges: chargeData.totalAmount.toString(),
            updatedAt: new Date()
          })
          .where(eq(admissions.id, admissionId));

        // Audit log
        await auditService.log({
          userId,
          action: 'ROOM_CHARGES_CREATED',
          resource: 'billing',
          resourceId: newCharge.id,
          details: {
            admissionId,
            totalAmount: chargeData.totalAmount,
            numberOfDays: chargeData.numberOfDays
          },
          facilityId,
          severity: 'medium'
        });

        return newCharge;
      }
    } catch (error) {
      logger.error('Create room charges error:', error);
      throw error;
    }
  }

  static async getRoomCharges(admissionId: string, facilityId: string) {
    try {
      const charges = await db.select({
        id: roomCharges.id,
        chargeDate: roomCharges.chargeDate,
        dailyRate: roomCharges.dailyRate,
        numberOfDays: roomCharges.numberOfDays,
        totalAmount: roomCharges.totalAmount,
        chargeType: roomCharges.chargeType,
        status: roomCharges.status,
        bedNumber: beds.bedNumber,
        wardName: wards.name
      })
      .from(roomCharges)
      .leftJoin(beds, eq(roomCharges.bedId, beds.id))
      .leftJoin(wards, eq(roomCharges.wardId, wards.id))
      .where(and(
        eq(roomCharges.admissionId, admissionId),
        eq(roomCharges.facilityId, facilityId),
        eq(roomCharges.isActive, true)
      ))
      .orderBy(desc(roomCharges.chargeDate));

      return charges;
    } catch (error) {
      logger.error('Get room charges error:', error);
      throw error;
    }
  }

  private static async generateAdmissionNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `ADM${timestamp}${random}`;
  }
}