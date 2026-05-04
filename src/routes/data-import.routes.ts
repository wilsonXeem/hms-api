import { Router } from 'express';
import { dataImportService } from '../services/data-import.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.post('/patients', 
  authMiddleware, 
  roleMiddleware(['admin', 'staff']),
  upload.single('file'),
  async (req, res) => {
    try {
      const fileContent = req.file?.buffer?.toString('utf-8');
      if (!fileContent) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const result = await dataImportService.importPatients(fileContent, req.user.id);
      res.json({ 
        success: true, 
        data: { 
          imported: result.success, 
          errors: result.errors 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post('/inventory',
  authMiddleware,
  roleMiddleware(['admin', 'staff']),
  upload.single('file'),
  async (req, res) => {
    try {
      const fileContent = req.file?.buffer?.toString('utf-8');
      if (!fileContent) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const result = await dataImportService.importInventoryItems(fileContent, req.user.id);
      res.json({ 
        success: true, 
        data: { 
          imported: result.success, 
          errors: result.errors 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;