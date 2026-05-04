import { db } from '../config/db.config';
import { auditService } from './audit.service';
import { logger } from '../utils/logger.util';

interface RetentionPolicy {
  id: string;
  name: string;
  dataType: 'patient_records' | 'audit_logs' | 'reports' | 'documents' | 'all';
  retentionPeriod: number;
  unit: 'days' | 'months' | 'years';
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

interface RetentionResult {
  itemsArchived: number;
  itemsDeleted: number;
  spaceFreed: number;
  errors: string[];
}

class DataRetentionService {
  private policies: RetentionPolicy[] = [];

  async createPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt'>): Promise<string> {
    const policyId = crypto.randomUUID();
    const newPolicy: RetentionPolicy = {
      ...policy,
      id: policyId,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(policy.retentionPeriod, policy.unit)
    };

    this.policies.push(newPolicy);

    await auditService.log({
      action: 'RETENTION_POLICY_CREATED',
      resource: 'data_retention',
      resourceId: policyId,
      details: policy,
      severity: 'high'
    });

    logger.info('Data retention policy created', { policyId, name: policy.name });
    return policyId;
  }

  async executeRetention(policyId?: string): Promise<RetentionResult> {
    const policiesToRun = policyId 
      ? this.policies.filter(p => p.id === policyId && p.status === 'active')
      : this.policies.filter(p => p.status === 'active' && (!p.nextRun || p.nextRun <= new Date()));

    let totalArchived = 0;
    let totalDeleted = 0;
    let totalSpaceFreed = 0;
    const errors: string[] = [];

    for (const policy of policiesToRun) {
      try {
        const result = await this.executePolicy(policy);
        totalArchived += result.itemsArchived;
        totalDeleted += result.itemsDeleted;
        totalSpaceFreed += result.spaceFreed;

        // Update policy run times
        policy.lastRun = new Date();
        policy.nextRun = this.calculateNextRun(policy.retentionPeriod, policy.unit);

        await auditService.log({
          action: 'RETENTION_POLICY_EXECUTED',
          resource: 'data_retention',
          resourceId: policy.id,
          details: result,
          severity: 'medium'
        });

      } catch (error) {
        const errorMsg = `Failed to execute policy ${policy.name}: ${error}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
      }
    }

    return {
      itemsArchived: totalArchived,
      itemsDeleted: totalDeleted,
      spaceFreed: totalSpaceFreed,
      errors
    };
  }

  private async executePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
    const cutoffDate = this.calculateCutoffDate(policy.retentionPeriod, policy.unit);
    let itemsArchived = 0;
    let itemsDeleted = 0;
    let spaceFreed = 0;

    switch (policy.dataType) {
      case 'audit_logs':
        const result = await this.cleanupAuditLogs(cutoffDate, policy.archiveBeforeDelete, policy.autoDelete);
        itemsArchived += result.archived;
        itemsDeleted += result.deleted;
        spaceFreed += result.spaceFreed;
        break;

      case 'reports':
        // Implement report cleanup
        logger.info('Report cleanup not yet implemented');
        break;

      case 'documents':
        // Implement document cleanup
        logger.info('Document cleanup not yet implemented');
        break;

      case 'patient_records':
        // Patient records require special handling due to legal requirements
        logger.warn('Patient record cleanup requires manual review');
        break;

      case 'all':
        // Execute all cleanup types
        const auditResult = await this.cleanupAuditLogs(cutoffDate, policy.archiveBeforeDelete, policy.autoDelete);
        itemsArchived += auditResult.archived;
        itemsDeleted += auditResult.deleted;
        spaceFreed += auditResult.spaceFreed;
        break;
    }

    return { itemsArchived, itemsDeleted, spaceFreed, errors: [] };
  }

  private async cleanupAuditLogs(cutoffDate: Date, archive: boolean, autoDelete: boolean) {
    let archived = 0;
    let deleted = 0;
    let spaceFreed = 0;

    try {
      // Get old audit logs
      const oldLogs = await (db as any).query(`
        SELECT id, details FROM activity_logs 
        WHERE timestamp < $1 AND severity IN ('low', 'medium')
      `, [cutoffDate]);

      if (archive && oldLogs.length > 0) {
        // Archive logs (in production, this would move to cold storage)
        logger.info(`Archiving ${oldLogs.length} audit logs`);
        archived = oldLogs.length;
        spaceFreed += oldLogs.length * 1024; // Estimate 1KB per log
      }

      if (autoDelete && oldLogs.length > 0) {
        // Delete old logs (keep critical and high severity logs)
        await (db as any).query(`
          DELETE FROM activity_logs 
          WHERE timestamp < $1 AND severity IN ('low', 'medium')
        `, [cutoffDate]);
        
        deleted = oldLogs.length;
        logger.info(`Deleted ${deleted} old audit logs`);
      }

    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }

    return { archived, deleted, spaceFreed };
  }

  private calculateCutoffDate(period: number, unit: string): Date {
    const now = new Date();
    switch (unit) {
      case 'days':
        return new Date(now.getTime() - (period * 24 * 60 * 60 * 1000));
      case 'months':
        return new Date(now.getFullYear(), now.getMonth() - period, now.getDate());
      case 'years':
        return new Date(now.getFullYear() - period, now.getMonth(), now.getDate());
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  private calculateNextRun(period: number, unit: string): Date {
    const now = new Date();
    // Run retention checks daily for active policies
    return new Date(now.getTime() + (24 * 60 * 60 * 1000));
  }

  async getPolicies(): Promise<RetentionPolicy[]> {
    return this.policies;
  }

  async getPolicy(id: string): Promise<RetentionPolicy | null> {
    return this.policies.find(p => p.id === id) || null;
  }

  async updatePolicy(id: string, updates: Partial<RetentionPolicy>): Promise<void> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Policy not found');

    this.policies[index] = { ...this.policies[index], ...updates };

    await auditService.log({
      action: 'RETENTION_POLICY_UPDATED',
      resource: 'data_retention',
      resourceId: id,
      details: updates,
      severity: 'medium'
    });
  }

  async deletePolicy(id: string): Promise<void> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Policy not found');

    this.policies.splice(index, 1);

    await auditService.log({
      action: 'RETENTION_POLICY_DELETED',
      resource: 'data_retention',
      resourceId: id,
      severity: 'high'
    });
  }

  // Initialize default policies
  async initializeDefaultPolicies(): Promise<void> {
    const defaultPolicies = [
      {
        name: 'Audit Log Retention',
        dataType: 'audit_logs' as const,
        retentionPeriod: 7,
        unit: 'years' as const,
        autoDelete: false,
        archiveBeforeDelete: true,
        status: 'active' as const
      },
      {
        name: 'Low Priority Log Cleanup',
        dataType: 'audit_logs' as const,
        retentionPeriod: 90,
        unit: 'days' as const,
        autoDelete: true,
        archiveBeforeDelete: true,
        status: 'active' as const
      }
    ];

    for (const policy of defaultPolicies) {
      if (!this.policies.some(p => p.name === policy.name)) {
        await this.createPolicy(policy);
      }
    }
  }
}

export const dataRetentionService = new DataRetentionService();
