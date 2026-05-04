import { db } from '../config/db.config';
import { patients } from '../models/patients.model';
import { auditService } from './audit.service';

export class DataImportService {
  async importPatients(csvData: string, userId: string): Promise<{ success: number; errors: any[] }> {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const results = { success: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      try {
        const patientData = {
          id: crypto.randomUUID(),
          patientCode: `PAT-${Date.now()}-${i}`,
          firstName: values[0]?.trim(),
          lastName: values[1]?.trim(),
          gender: values[2]?.trim() as 'male' | 'female' | 'other',
          dob: values[3]?.trim() || null,
          phone: values[4]?.trim(),
          bloodGroup: values[5]?.trim(),
          address: values[6]?.trim(),
          emergencyContact: values[7]?.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(patients).values(patientData);
        await auditService.log({
          userId,
          action: 'PATIENT_IMPORT',
          resource: 'patient',
          resourceId: patientData.id,
          details: { importedData: patientData }
        });
        
        results.success++;
      } catch (error) {
        results.errors.push({ line: i + 1, error: error.message });
      }
    }

    return results;
  }

  async importInventoryItems(csvData: string, userId: string): Promise<{ success: number; errors: any[] }> {
    // Similar implementation for inventory import
    return { success: 0, errors: [] };
  }
}

export const dataImportService = new DataImportService();
