import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

interface AuditRequest extends Request {
  user?: { id: string; role: string };
}

export const auditMiddleware = (action: string, resource: string) => {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const auditData = {
          userId: req.user?.id,
          action,
          resource,
          resourceId: req.params.id || req.params.patientId || req.params.itemId,
          details: {
            method: req.method,
            url: req.originalUrl,
            body: req.method !== 'GET' ? req.body : undefined,
            query: req.query,
            statusCode: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        };

        auditService.log(auditData).catch(error => {
          console.error('Audit logging failed:', error);
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
};

// Predefined audit middleware for common operations
export const auditPatientAccess = auditMiddleware('ACCESS', 'patient');
export const auditPatientCreate = auditMiddleware('CREATE', 'patient');
export const auditPatientUpdate = auditMiddleware('UPDATE', 'patient');
export const auditPrescriptionCreate = auditMiddleware('CREATE', 'prescription');
export const auditInventoryUpdate = auditMiddleware('UPDATE', 'inventory');
export const auditLabResult = auditMiddleware('CREATE', 'lab_result');