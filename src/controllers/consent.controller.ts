import { Request, Response } from 'express';
import { hipaaComplianceService } from '../services/hipaa-compliance.service';
import { auditService } from '../services/audit.service';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export class ConsentController {
  async recordConsent(req: AuthRequest, res: Response) {
    try {
      const { patientId, consentType, granted } = req.body;
      const userId = req.user?.id!;

      const consentId = await hipaaComplianceService.recordConsent({
        patientId,
        consentType,
        granted,
        grantedBy: userId,
        grantedAt: new Date()
      });

      await auditService.log({
        userId,
        action: 'CONSENT_RECORDED',
        resource: 'patient_consent',
        resourceId: patientId,
        details: { consentType, granted, consentId },
        severity: 'high'
      });

      res.status(201).json({ consentId, message: 'Consent recorded successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record consent' });
    }
  }

  async revokeConsent(req: AuthRequest, res: Response) {
    try {
      const { consentId } = req.params;
      const userId = req.user?.id!;

      await hipaaComplianceService.revokeConsent(consentId, userId);

      res.json({ message: 'Consent revoked successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke consent' });
    }
  }

  async checkConsent(req: Request, res: Response) {
    try {
      const { patientId, consentType } = req.params;

      const hasConsent = await hipaaComplianceService.checkConsent(patientId, consentType as any);

      res.json({ hasConsent });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check consent' });
    }
  }
}

export const consentController = new ConsentController();