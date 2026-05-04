import { db } from '../config/db.config';
import { auditService } from './audit.service';
import { encryptionService } from './encryption.service';
import { logger } from '../utils/logger.util';

interface HIPAAViolation {
  id: string;
  type: 'access' | 'disclosure' | 'breach' | 'unauthorized';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  patientId?: string;
  timestamp: Date;
  resolved: boolean;
  reportedToOCR: boolean;
}

interface ConsentRecord {
  id: string;
  patientId: string;
  consentType: 'treatment' | 'disclosure' | 'marketing' | 'research';
  granted: boolean;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

class HIPAAComplianceService {
  private violations: HIPAAViolation[] = [];
  private consentRecords: ConsentRecord[] = [];

  // Patient consent management
  async recordConsent(data: Omit<ConsentRecord, 'id'>): Promise<string> {
    const consentId = crypto.randomUUID();
    const consent: ConsentRecord = { ...data, id: consentId };
    
    this.consentRecords.push(consent);
    
    await auditService.log({
      action: 'CONSENT_RECORDED',
      resource: 'patient_consent',
      resourceId: data.patientId,
      details: { consentType: data.consentType, granted: data.granted },
      severity: 'high'
    });

    logger.info('Patient consent recorded', { consentId, patientId: data.patientId });
    return consentId;
  }

  async revokeConsent(consentId: string, revokedBy: string): Promise<void> {
    const consent = this.consentRecords.find(c => c.id === consentId);
    if (!consent) throw new Error('Consent record not found');

    consent.revokedAt = new Date();
    consent.revokedBy = revokedBy;

    await auditService.log({
      action: 'CONSENT_REVOKED',
      resource: 'patient_consent',
      resourceId: consent.patientId,
      details: { consentType: consent.consentType, revokedBy },
      severity: 'high'
    });
  }

  async checkConsent(patientId: string, consentType: ConsentRecord['consentType']): Promise<boolean> {
    const consent = this.consentRecords.find(c => 
      c.patientId === patientId && 
      c.consentType === consentType && 
      c.granted && 
      !c.revokedAt &&
      (!c.expiresAt || c.expiresAt > new Date())
    );
    return !!consent;
  }

  // HIPAA violation tracking
  async reportViolation(violation: Omit<HIPAAViolation, 'id' | 'timestamp' | 'resolved' | 'reportedToOCR'>): Promise<void> {
    const violationRecord: HIPAAViolation = {
      ...violation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      reportedToOCR: violation.severity === 'critical'
    };

    this.violations.push(violationRecord);

    await auditService.log({
      action: 'HIPAA_VIOLATION_REPORTED',
      resource: 'compliance',
      details: violation,
      severity: 'critical'
    });

    if (violation.severity === 'critical') {
      await this.notifyBreachResponse(violationRecord);
    }

    logger.error('HIPAA violation reported', violation);
  }

  // Data breach notification
  private async notifyBreachResponse(violation: HIPAAViolation): Promise<void> {
    // Immediate breach response protocol
    logger.error('CRITICAL HIPAA BREACH DETECTED', {
      violationId: violation.id,
      type: violation.type,
      description: violation.description
    });

    // In production, this would trigger:
    // 1. Immediate containment measures
    // 2. Risk assessment
    // 3. Notification to affected individuals (within 60 days)
    // 4. Notification to HHS OCR (within 60 days)
    // 5. Media notification if breach affects 500+ individuals
  }

  // Access control validation
  async validateAccess(userId: string, patientId: string, action: string): Promise<boolean> {
    // Check minimum necessary standard
    const hasConsent = await this.checkConsent(patientId, 'treatment');
    
    if (!hasConsent) {
      await this.reportViolation({
        type: 'access',
        severity: 'high',
        description: `Unauthorized access attempt to patient ${patientId}`,
        userId,
        patientId
      });
      return false;
    }

    await auditService.logPatientAccess(userId, patientId, action, '');
    return true;
  }

  // PHI encryption validation
  async validatePHIEncryption(data: any): Promise<boolean> {
    const phiFields = ['ssn', 'medicalRecordNumber', 'insuranceNumber', 'creditCardNumber'];
    
    for (const field of phiFields) {
      if (data[field] && !this.isEncrypted(data[field])) {
        await this.reportViolation({
          type: 'disclosure',
          severity: 'critical',
          description: `Unencrypted PHI detected in field: ${field}`
        });
        return false;
      }
    }
    return true;
  }

  private isEncrypted(value: string): boolean {
    // Check if value follows encrypted format (iv:tag:encrypted)
    return /^[a-f0-9]{32}:[a-f0-9]{32}:[a-f0-9]+$/.test(value);
  }

  // Compliance reporting
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const violations = this.violations.filter(v => 
      v.timestamp >= startDate && v.timestamp <= endDate
    );

    const consentActivity = this.consentRecords.filter(c =>
      c.grantedAt >= startDate && c.grantedAt <= endDate
    );

    return {
      period: { startDate, endDate },
      violations: {
        total: violations.length,
        bySeverity: this.groupBy(violations, 'severity'),
        byType: this.groupBy(violations, 'type'),
        resolved: violations.filter(v => v.resolved).length
      },
      consent: {
        total: consentActivity.length,
        granted: consentActivity.filter(c => c.granted).length,
        revoked: consentActivity.filter(c => c.revokedAt).length
      },
      recommendations: this.generateRecommendations(violations)
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
      return acc;
    }, {});
  }

  private generateRecommendations(violations: HIPAAViolation[]): string[] {
    const recommendations = [];
    
    if (violations.some(v => v.type === 'access')) {
      recommendations.push('Review access controls and implement additional authentication measures');
    }
    
    if (violations.some(v => v.type === 'disclosure')) {
      recommendations.push('Enhance data encryption and transmission security');
    }
    
    if (violations.length > 10) {
      recommendations.push('Conduct comprehensive HIPAA training for all staff');
    }

    return recommendations;
  }

  // Business Associate Agreement validation
  async validateBAA(vendorId: string): Promise<boolean> {
    // In production, this would check against a BAA database
    logger.info('BAA validation requested', { vendorId });
    return true; // Placeholder
  }
}

export const hipaaComplianceService = new HIPAAComplianceService();
