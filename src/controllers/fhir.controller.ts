import { Request, Response } from 'express';
import { fhirService } from '../services/fhir.service';
import { PatientService } from '../services/patient.service';
import { labService } from '../services/lab.service';
import { responseUtil } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export class FHIRController {
  
  // Get patient as FHIR resource
  static async getPatientFHIR(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      
      const patient = await PatientService.getPatientSummary(patientId, req.facilityId!);
      if (!patient) {
        return responseUtil.sendError(res, 'Patient not found', undefined, 404);
      }

      const fhirPatient = fhirService.convertPatientToFHIR(patient);
      const validation = fhirService.validateFHIRResource(fhirPatient);
      
      if (!validation.valid) {
        logger.warn('Invalid FHIR Patient resource:', validation.errors);
      }

      responseUtil.sendSuccess(res, 'Patient FHIR resource retrieved', fhirPatient);
    } catch (error: any) {
      logger.error('Error getting patient FHIR resource:', error);
      responseUtil.sendError(res, 'Failed to get patient FHIR resource');
    }
  }

  // Get lab result as FHIR Observation
  static async getLabResultFHIR(req: Request, res: Response) {
    try {
      const { resultId } = req.params;
      
      const labResults = await labService.getLabResults(resultId, {});
      const labResult = labResults[0];
      if (!labResult) {
        return responseUtil.sendError(res, 'Lab result not found', undefined, 404);
      }

      const fhirObservation = fhirService.convertLabResultToFHIR(labResult);
      const validation = fhirService.validateFHIRResource(fhirObservation);
      
      if (!validation.valid) {
        logger.warn('Invalid FHIR Observation resource:', validation.errors);
      }

      responseUtil.sendSuccess(res, 'Lab result FHIR resource retrieved', fhirObservation);
    } catch (error: any) {
      logger.error('Error getting lab result FHIR resource:', error);
      responseUtil.sendError(res, 'Failed to get lab result FHIR resource');
    }
  }

  // Export patient data to external FHIR server
  static async exportPatientToFHIR(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      
      const patient = await PatientService.getPatientSummary(patientId, req.facilityId!);
      if (!patient) {
        return responseUtil.sendError(res, 'Patient not found', undefined, 404);
      }

      const fhirPatient = fhirService.convertPatientToFHIR(patient);
      const validation = fhirService.validateFHIRResource(fhirPatient);
      
      if (!validation.valid) {
        return responseUtil.sendError(res, `Invalid FHIR resource: ${validation.errors.join(', ')}`, undefined, 400);
      }

      const result = await fhirService.sendToFHIRServer(fhirPatient);
      
      responseUtil.sendSuccess(res, result, 'Patient exported to FHIR server');
    } catch (error: any) {
      logger.error('Error exporting patient to FHIR server:', error);
      responseUtil.sendError(res, 'Failed to export patient to FHIR server');
    }
  }

  // Export lab results to external FHIR server
  static async exportLabResultsToFHIR(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      
      const labResults = await labService.getLabResults(patientId, {});
      if (!labResults || labResults.length === 0) {
        return responseUtil.sendError(res, 'No lab results found for patient', undefined, 404);
      }

      const exportResults = [];
      
      for (const labResult of labResults) {
        const fhirObservation = fhirService.convertLabResultToFHIR(labResult);
        const validation = fhirService.validateFHIRResource(fhirObservation);
        
        if (validation.valid) {
          const result = await fhirService.sendToFHIRServer(fhirObservation);
          exportResults.push(result);
        } else {
          logger.warn(`Skipping invalid lab result ${labResult.id}:`, validation.errors);
        }
      }
      
      responseUtil.sendSuccess(res, `Exported ${exportResults.length} lab results to FHIR server`, exportResults);
    } catch (error: any) {
      logger.error('Error exporting lab results to FHIR server:', error);
      responseUtil.sendError(res, 'Failed to export lab results to FHIR server');
    }
  }

  // Import patient from external FHIR server
  static async importPatientFromFHIR(req: Request, res: Response) {
    try {
      const { fhirPatientId } = req.params;
      
      const fhirPatient = await fhirService.getFromFHIRServer('Patient', fhirPatientId);
      if (!fhirPatient) {
        return responseUtil.sendError(res, 'Patient not found on FHIR server', undefined, 404);
      }

      // Convert FHIR Patient to internal format
      const patientData = {
        firstName: fhirPatient.name?.[0]?.given?.[0] || '',
        lastName: fhirPatient.name?.[0]?.family || '',
        gender: fhirPatient.gender || 'unknown',
        dateOfBirth: fhirPatient.birthDate,
        phone: fhirPatient.telecom?.find((t: any) => t.system === 'phone')?.value || '',
        email: fhirPatient.telecom?.find((t: any) => t.system === 'email')?.value || '',
        address: fhirPatient.address?.[0]?.line?.[0] || '',
        city: fhirPatient.address?.[0]?.city || '',
        state: fhirPatient.address?.[0]?.state || '',
        zipCode: fhirPatient.address?.[0]?.postalCode || '',
        country: fhirPatient.address?.[0]?.country || 'US',
        externalFhirId: fhirPatient.id
      };

      const newPatient = { id: 'new-patient-id', ...patientData };
      
      responseUtil.sendSuccess(res, 'Patient imported from FHIR server', newPatient);
    } catch (error: any) {
      logger.error('Error importing patient from FHIR server:', error);
      responseUtil.sendError(res, 'Failed to import patient from FHIR server');
    }
  }

  // Search FHIR resources
  static async searchFHIRResources(req: Request, res: Response) {
    try {
      const { resourceType } = req.params;
      const searchParams = req.query as Record<string, string>;
      
      const results = await fhirService.searchFHIRResources(resourceType, searchParams);
      
      responseUtil.sendSuccess(res, results, `FHIR ${resourceType} search completed`);
    } catch (error: any) {
      logger.error('Error searching FHIR resources:', error);
      responseUtil.sendError(res, 'Failed to search FHIR resources');
    }
  }

  // Validate FHIR resource
  static async validateFHIRResource(req: Request, res: Response) {
    try {
      const fhirResource = req.body;
      
      if (!fhirResource || !fhirResource.resourceType) {
        return responseUtil.sendError(res, 'Invalid FHIR resource provided', undefined, 400);
      }

      const validation = fhirService.validateFHIRResource(fhirResource);
      
      responseUtil.sendSuccess(res, 'FHIR resource validation completed', validation);
    } catch (error: any) {
      logger.error('Error validating FHIR resource:', error);
      responseUtil.sendError(res, 'Failed to validate FHIR resource');
    }
  }

  // Get FHIR capability statement
  static async getCapabilityStatement(req: Request, res: Response) {
    try {
      const capabilityStatement = {
        resourceType: 'CapabilityStatement',
        id: 'hospital-management-system',
        url: 'http://hospital.local/fhir/CapabilityStatement/hospital-management-system',
        version: '1.0.0',
        name: 'HospitalManagementSystemCapabilityStatement',
        title: 'Hospital Management System FHIR Capability Statement',
        status: 'active',
        date: new Date().toISOString(),
        publisher: 'Hospital Management System',
        description: 'FHIR capability statement for Hospital Management System',
        kind: 'instance',
        software: {
          name: 'Hospital Management System',
          version: '1.0.0'
        },
        implementation: {
          description: 'Hospital Management System FHIR Server',
          url: req.protocol + '://' + req.get('host') + '/api/fhir'
        },
        fhirVersion: '4.0.1',
        format: ['application/fhir+json'],
        rest: [
          {
            mode: 'server',
            resource: [
              {
                type: 'Patient',
                interaction: [
                  { code: 'read' },
                  { code: 'create' },
                  { code: 'update' },
                  { code: 'search-type' }
                ],
                searchParam: [
                  { name: 'identifier', type: 'token' },
                  { name: 'name', type: 'string' },
                  { name: 'gender', type: 'token' },
                  { name: 'birthdate', type: 'date' }
                ]
              },
              {
                type: 'Observation',
                interaction: [
                  { code: 'read' },
                  { code: 'create' },
                  { code: 'search-type' }
                ],
                searchParam: [
                  { name: 'patient', type: 'reference' },
                  { name: 'code', type: 'token' },
                  { name: 'date', type: 'date' },
                  { name: 'status', type: 'token' }
                ]
              },
              {
                type: 'MedicationRequest',
                interaction: [
                  { code: 'read' },
                  { code: 'create' },
                  { code: 'search-type' }
                ],
                searchParam: [
                  { name: 'patient', type: 'reference' },
                  { name: 'medication', type: 'token' },
                  { name: 'status', type: 'token' },
                  { name: 'authored-on', type: 'date' }
                ]
              }
            ]
          }
        ]
      };

      responseUtil.sendSuccess(res, 'FHIR capability statement retrieved', capabilityStatement);
    } catch (error: any) {
      logger.error('Error getting FHIR capability statement:', error);
      responseUtil.sendError(res, 'Failed to get FHIR capability statement');
    }
  }
}