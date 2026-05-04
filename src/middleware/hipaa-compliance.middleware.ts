import { Request, Response, NextFunction } from 'express';
import { hipaaComplianceService } from '../services/hipaa-compliance.service';
import { logger } from '../utils/logger.util';

interface HIPAARequest extends Request {
  user?: { id: string; role: string };
}

// Middleware to validate HIPAA compliance for patient data access
export const hipaaAccessControl = async (req: HIPAARequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const patientId = req.params.patientId || req.params.id;
    const action = `${req.method}_${req.route?.path || req.path}`;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required for PHI access' });
    }

    if (patientId) {
      const hasAccess = await hipaaComplianceService.validateAccess(userId, patientId, action);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'HIPAA violation: Unauthorized access to protected health information' 
        });
      }
    }

    next();
  } catch (error) {
    logger.error('HIPAA access control error:', error);
    res.status(500).json({ error: 'Compliance validation failed' });
  }
};

// Middleware to validate PHI encryption in requests
export const phiEncryptionValidation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const isValid = await hipaaComplianceService.validatePHIEncryption(req.body);
      if (!isValid) {
        return res.status(400).json({ 
          error: 'HIPAA violation: PHI must be encrypted' 
        });
      }
    }
    next();
  } catch (error) {
    logger.error('PHI encryption validation error:', error);
    res.status(500).json({ error: 'Encryption validation failed' });
  }
};

// Middleware to log minimum necessary access
export const minimumNecessaryLogging = (req: HIPAARequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Log what PHI was accessed and why
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('PHI access logged', {
        userId: req.user?.id,
        method: req.method,
        path: req.path,
        patientId: req.params.patientId || req.params.id,
        timestamp: new Date().toISOString(),
        justification: req.headers['x-access-justification'] || 'Treatment'
      });
    }
    
    return originalSend.call(this, data);
  };

  next();
};

// Middleware to enforce consent requirements
export const consentValidation = async (req: HIPAARequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patientId || req.params.id;
    const consentType = req.headers['x-consent-type'] as string || 'treatment';

    if (patientId && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const hasConsent = await hipaaComplianceService.checkConsent(patientId, consentType as any);
      if (!hasConsent) {
        return res.status(403).json({ 
          error: 'Patient consent required for this operation' 
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Consent validation error:', error);
    res.status(500).json({ error: 'Consent validation failed' });
  }
};