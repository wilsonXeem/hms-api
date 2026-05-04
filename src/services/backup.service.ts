import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class BackupService {
  private backupDir = path.join(process.cwd(), 'backups');

  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFile = `hms_backup_${timestamp}.sql.gz`;
      
      await execAsync('chmod +x scripts/backup-database.sh');
      const { stdout, stderr } = await execAsync('./scripts/backup-database.sh');
      
      if (stderr && !stderr.includes('NOTICE')) {
        throw new Error(stderr);
      }
      
      logger.info('Database backup created successfully', { backupFile });
      return backupFile;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(file => file.startsWith('hms_backup_') && file.endsWith('.sql.gz'))
        .sort()
        .reverse();
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  async restoreBackup(backupFile: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, backupFile);
      await execAsync('chmod +x scripts/restore-database.sh');
      
      // Note: This would need manual confirmation in production
      const { stdout, stderr } = await execAsync(`echo "y" | ./scripts/restore-database.sh ${backupPath}`);
      
      if (stderr && !stderr.includes('NOTICE')) {
        throw new Error(stderr);
      }
      
      logger.info('Database restored successfully', { backupFile });
    } catch (error) {
      logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  async scheduleBackup(cronExpression: string = '0 2 * * *'): Promise<void> {
    // Daily backup at 2 AM by default
    logger.info('Backup scheduling would be implemented with cron job', { cronExpression });
  }
}

export const backupService = new BackupService();