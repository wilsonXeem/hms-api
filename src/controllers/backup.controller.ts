import { Request, Response } from 'express';
import { backupService } from '../services/backup.service';
import { successResponse, errorResponse } from '../utils/response.util';

export const createBackup = async (req: Request, res: Response) => {
  try {
    const backupFile = await backupService.createBackup();
    successResponse(res, 'Backup created successfully', { backupFile }, 201);
  } catch (error) {
    errorResponse(res, 'Failed to create backup', undefined, 500);
  }
};

export const listBackups = async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();
    successResponse(res, 'Backups retrieved successfully', { backups });
  } catch (error) {
    errorResponse(res, 'Failed to list backups', undefined, 500);
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { backupFile } = req.params;
    await backupService.restoreBackup(backupFile);
    successResponse(res, 'Database restored successfully');
  } catch (error) {
    errorResponse(res, 'Failed to restore backup', undefined, 500);
  }
};