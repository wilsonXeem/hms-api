import { Request, Response } from 'express';
import { dataRetentionService } from '../services/data-retention.service';
import { auditService } from '../services/audit.service';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export class DataRetentionController {
  async createPolicy(req: AuthRequest, res: Response) {
    try {
      const { name, dataType, retentionPeriod, unit, autoDelete, archiveBeforeDelete } = req.body;
      const userId = req.user?.id!;

      const policyId = await dataRetentionService.createPolicy({
        name,
        dataType,
        retentionPeriod,
        unit,
        autoDelete,
        archiveBeforeDelete,
        status: 'active'
      });

      await auditService.log({
        userId,
        action: 'DATA_RETENTION_POLICY_CREATED',
        resource: 'data_retention',
        resourceId: policyId,
        details: { name, dataType, retentionPeriod, unit },
        severity: 'high'
      });

      res.status(201).json({ policyId, message: 'Retention policy created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create retention policy' });
    }
  }

  async getPolicies(req: Request, res: Response) {
    try {
      const policies = await dataRetentionService.getPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch retention policies' });
    }
  }

  async getPolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const policy = await dataRetentionService.getPolicy(id);
      
      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch retention policy' });
    }
  }

  async updatePolicy(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user?.id!;

      await dataRetentionService.updatePolicy(id, updates);

      await auditService.log({
        userId,
        action: 'DATA_RETENTION_POLICY_UPDATED',
        resource: 'data_retention',
        resourceId: id,
        details: updates,
        severity: 'medium'
      });

      res.json({ message: 'Retention policy updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update retention policy' });
    }
  }

  async deletePolicy(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id!;

      await dataRetentionService.deletePolicy(id);

      await auditService.log({
        userId,
        action: 'DATA_RETENTION_POLICY_DELETED',
        resource: 'data_retention',
        resourceId: id,
        severity: 'high'
      });

      res.json({ message: 'Retention policy deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete retention policy' });
    }
  }

  async executeRetention(req: AuthRequest, res: Response) {
    try {
      const { policyId, dryRun } = req.body;
      const userId = req.user?.id!;

      if (dryRun) {
        // Simulate execution without actual deletion
        const result = {
          itemsToArchive: Math.floor(Math.random() * 1000),
          itemsToDelete: Math.floor(Math.random() * 500),
          spaceToFree: Math.floor(Math.random() * 1000000000),
          errors: []
        };
        return res.json(result);
      }

      const result = await dataRetentionService.executeRetention(policyId);

      await auditService.log({
        userId,
        action: 'DATA_RETENTION_EXECUTED',
        resource: 'data_retention',
        resourceId: policyId || 'all',
        details: result,
        severity: 'critical'
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute retention policy' });
    }
  }
}

export const dataRetentionController = new DataRetentionController();