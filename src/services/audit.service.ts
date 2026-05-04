import { db } from '../config/db.config';
import { activityLogs } from '../models/activity-logs.model';
import { logger } from '../utils/logger.util';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  facilityId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AdmissionAuditData {
  admissionNumber: string;
  patientId: string;
  admissionType: string;
  bedId?: string;
  wardId?: string;
  admittingDoctorId: string;
  admissionReason?: string;
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        userId: data.userId,
        module: data.resource,
        action: data.action,
        details: JSON.stringify({
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          facilityId: data.facilityId,
          severity: data.severity || 'low'
        })
      });

      logger.info('Audit log created', {
        action: data.action,
        resource: data.resource,
        userId: data.userId
      });
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  }

  // Get admission/discharge audit trail for compliance
  async getAdmissionAuditTrail(admissionId: string, facilityId: string) {
    try {
      const logs = await db.select()
        .from(activityLogs)
        .where(and(
          eq(activityLogs.module, 'admission'),
          eq(activityLogs.action, 'ADMISSION_CREATED')
        ))
        .orderBy(desc(activityLogs.createdAt));

      return logs.filter(log => {
        const details = JSON.parse(log.details || '{}');
        return details.resourceId === admissionId && details.facilityId === facilityId;
      });
    } catch (error) {
      logger.error('Get admission audit trail error:', error);
      return [];
    }
  }

  // Predefined audit actions
  async logLogin(userId: string, ipAddress: string, userAgent: string, success: boolean): Promise<void> {
    await this.log({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      resource: 'auth',
      ipAddress,
      userAgent,
      severity: success ? 'low' : 'medium'
    });
  }

  async logPatientAccess(userId: string, patientId: string, action: string, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `PATIENT_${action.toUpperCase()}`,
      resource: 'patient',
      resourceId: patientId,
      ipAddress,
      severity: 'medium'
    });
  }

  async logMedicalRecord(userId: string, patientId: string, action: string, details: any, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `MEDICAL_RECORD_${action.toUpperCase()}`,
      resource: 'medical_record',
      resourceId: patientId,
      details,
      ipAddress,
      severity: 'high'
    });
  }

  async logPrescription(userId: string, prescriptionId: string, action: string, details: any, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `PRESCRIPTION_${action.toUpperCase()}`,
      resource: 'prescription',
      resourceId: prescriptionId,
      details,
      ipAddress,
      severity: 'high'
    });
  }

  async logInventoryChange(userId: string, itemId: string, action: string, details: any, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `INVENTORY_${action.toUpperCase()}`,
      resource: 'inventory',
      resourceId: itemId,
      details,
      ipAddress,
      severity: 'medium'
    });
  }

  async logSystemChange(userId: string, action: string, details: any, ipAddress: string): Promise<void> {
    await this.log({
      userId,
      action: `SYSTEM_${action.toUpperCase()}`,
      resource: 'system',
      details,
      ipAddress,
      severity: 'critical'
    });
  }

  // Admission/Discharge specific audit methods for compliance
  async logAdmissionEvent(userId: string, admissionId: string, patientId: string, action: 'CREATED' | 'UPDATED', details: any, ipAddress: string, facilityId: string): Promise<void> {
    await this.log({
      userId,
      action: `ADMISSION_${action}`,
      resource: 'admission',
      resourceId: admissionId,
      details: {
        patientId,
        timestamp: new Date().toISOString(),
        ...details
      },
      ipAddress,
      facilityId,
      severity: 'high'
    });
  }

  async logDischargeEvent(userId: string, admissionId: string, patientId: string, details: any, ipAddress: string, facilityId: string): Promise<void> {
    await this.log({
      userId,
      action: 'PATIENT_DISCHARGED',
      resource: 'admission',
      resourceId: admissionId,
      details: {
        patientId,
        dischargeTimestamp: new Date().toISOString(),
        ...details
      },
      ipAddress,
      facilityId,
      severity: 'high'
    });
  }

  async logBedTransfer(userId: string, admissionId: string, patientId: string, fromBedId: string, toBedId: string, ipAddress: string, facilityId: string): Promise<void> {
    await this.log({
      userId,
      action: 'PATIENT_TRANSFERRED',
      resource: 'admission',
      resourceId: admissionId,
      details: {
        patientId,
        fromBedId,
        toBedId,
        transferTimestamp: new Date().toISOString()
      },
      ipAddress,
      facilityId,
      severity: 'medium'
    });
  }
}

export const auditService = new AuditService();