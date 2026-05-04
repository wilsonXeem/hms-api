import { Request, Response } from 'express';
import { pharmacyIntegrationService } from '../services/pharmacy-integration.service';
import { responseUtil } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export class PharmacyIntegrationController {

  static async sendPrescriptionToPharmacy(req: Request, res: Response) {
    try {
      const { prescriptionId } = req.params;
      const { pharmacyId, deliveryMethod, priority } = req.body;

      // Mock prescription data - in real implementation, fetch from database
      const prescriptionData = {
        id: prescriptionId,
        patientId: req.body.patientId || '123',
        items: req.body.medications || [
          {
            medicationName: 'Lisinopril',
            quantity: 30,
            instructions: 'Take once daily',
            ndc: '12345-678-90'
          }
        ],
        deliveryMethod: deliveryMethod || 'pickup',
        priority: priority || 'routine'
      };

      const result = await pharmacyIntegrationService.sendPrescriptionToPharmacy(
        prescriptionData,
        pharmacyId
      );

      responseUtil.sendSuccess(res, 'Prescription sent to pharmacy successfully', result);
    } catch (error: any) {
      logger.error('Error sending prescription to pharmacy:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async checkMedicationAvailability(req: Request, res: Response) {
    try {
      const { ndc } = req.params;
      const { pharmacyId } = req.query;

      const availability = await pharmacyIntegrationService.checkMedicationAvailability(
        ndc,
        pharmacyId as string
      );

      if (!availability) {
        return responseUtil.sendError(res, 'Medication not found');
      }

      responseUtil.sendSuccess(res, 'Medication availability retrieved', availability);
    } catch (error: any) {
      logger.error('Error checking medication availability:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async getPrescriptionStatus(req: Request, res: Response) {
    try {
      const { pharmacyOrderId } = req.params;
      const { pharmacyId } = req.query;

      const status = await pharmacyIntegrationService.getPrescriptionStatus(
        pharmacyOrderId,
        pharmacyId as string
      );

      responseUtil.sendSuccess(res, 'Prescription status retrieved', status);
    } catch (error: any) {
      logger.error('Error getting prescription status:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async searchMedications(req: Request, res: Response) {
    try {
      const { query } = req.query;
      const { pharmacyId } = req.query;

      if (!query) {
        return responseUtil.sendError(res, 'Search query is required');
      }

      const medications = await pharmacyIntegrationService.searchMedications(
        query as string,
        pharmacyId as string
      );

      responseUtil.sendSuccess(res, 'Medication search completed', medications);
    } catch (error: any) {
      logger.error('Error searching medications:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async getPharmacyLocations(req: Request, res: Response) {
    try {
      const { zipCode, radius } = req.query;

      if (!zipCode) {
        return responseUtil.sendError(res, 'ZIP code is required');
      }

      const locations = await pharmacyIntegrationService.getPharmacyLocations(
        zipCode as string,
        radius ? parseInt(radius as string) : 10
      );

      responseUtil.sendSuccess(res, 'Pharmacy locations retrieved', locations);
    } catch (error: any) {
      logger.error('Error getting pharmacy locations:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async transferPrescription(req: Request, res: Response) {
    try {
      const { prescriptionId } = req.params;
      const { fromPharmacy, toPharmacy } = req.body;

      if (!fromPharmacy || !toPharmacy) {
        return responseUtil.sendError(res, 'Both source and destination pharmacies are required');
      }

      const result = await pharmacyIntegrationService.transferPrescription(
        prescriptionId,
        fromPharmacy,
        toPharmacy
      );

      responseUtil.sendSuccess(res, 'Prescription transfer initiated', result);
    } catch (error: any) {
      logger.error('Error transferring prescription:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async getAvailableProviders(req: Request, res: Response) {
    try {
      const providers = pharmacyIntegrationService.getAvailableProviders();
      responseUtil.sendSuccess(res, 'Available pharmacy providers retrieved', providers);
    } catch (error: any) {
      logger.error('Error getting pharmacy providers:', error);
      responseUtil.sendError(res, error.message);
    }
  }

  static async bulkPrescriptionSubmission(req: Request, res: Response) {
    try {
      const { prescriptions, pharmacyId } = req.body;

      if (!prescriptions || !Array.isArray(prescriptions)) {
        return responseUtil.sendError(res, 'Prescriptions array is required');
      }

      const results = [];
      
      for (const prescription of prescriptions) {
        try {
          const result = await pharmacyIntegrationService.sendPrescriptionToPharmacy(
            prescription,
            pharmacyId
          );
          results.push({ prescriptionId: prescription.id, success: true, result });
        } catch (error: any) {
          results.push({ 
            prescriptionId: prescription.id, 
            success: false, 
            error: error.message 
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      responseUtil.sendSuccess(
        res,
        `Bulk prescription submission completed: ${successCount}/${prescriptions.length} successful`,
        { results, summary: { total: prescriptions.length, successful: successCount, failed: prescriptions.length - successCount } }
      );
    } catch (error: any) {
      logger.error('Error in bulk prescription submission:', error);
      responseUtil.sendError(res, error.message);
    }
  }
}