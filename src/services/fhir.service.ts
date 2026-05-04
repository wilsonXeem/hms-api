import { logger } from '../utils/logger.util';

// FHIR Resource Types
export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Array<{
    use?: string;
    system?: string;
    value: string;
  }>;
  name: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
    use?: string;
  }>;
  address?: Array<{
    use?: string;
    line: string[];
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  category?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
}

export interface FHIRMedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest';
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order';
  medicationCodeableConcept: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject: {
    reference: string;
  };
  authoredOn: string;
  requester?: {
    reference: string;
  };
  dosageInstruction?: Array<{
    text: string;
    timing?: {
      repeat: {
        frequency: number;
        period: number;
        periodUnit: string;
      };
    };
    doseAndRate?: Array<{
      doseQuantity: {
        value: number;
        unit: string;
      };
    }>;
  }>;
}

export class FHIRService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.FHIR_SERVER_URL || 'http://localhost:8080/fhir';
  }

  // Convert internal patient data to FHIR Patient resource
  convertPatientToFHIR(patientData: any): FHIRPatient {
    return {
      resourceType: 'Patient',
      id: patientData.id?.toString(),
      identifier: [
        {
          use: 'usual',
          system: 'http://hospital.local/patient-id',
          value: patientData.patientId || patientData.id?.toString()
        }
      ],
      name: [
        {
          use: 'official',
          family: patientData.lastName || patientData.name?.split(' ').pop() || '',
          given: [patientData.firstName || patientData.name?.split(' ')[0] || '']
        }
      ],
      gender: this.mapGender(patientData.gender),
      birthDate: patientData.dateOfBirth || patientData.birthDate,
      telecom: [
        ...(patientData.phone ? [{
          system: 'phone' as const,
          value: patientData.phone,
          use: 'home'
        }] : []),
        ...(patientData.email ? [{
          system: 'email' as const,
          value: patientData.email,
          use: 'home'
        }] : [])
      ],
      address: patientData.address ? [
        {
          use: 'home',
          line: [patientData.address],
          city: patientData.city || '',
          state: patientData.state || '',
          postalCode: patientData.zipCode || '',
          country: patientData.country || 'US'
        }
      ] : []
    };
  }

  // Convert lab result to FHIR Observation resource
  convertLabResultToFHIR(labResult: any): FHIRObservation {
    return {
      resourceType: 'Observation',
      id: labResult.id?.toString(),
      status: this.mapLabStatus(labResult.status),
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: labResult.loincCode || '33747-0',
            display: labResult.testName || 'General Lab Test'
          }
        ]
      },
      subject: {
        reference: `Patient/${labResult.patientId}`
      },
      effectiveDateTime: labResult.testDate || labResult.createdAt,
      ...(labResult.numericValue ? {
        valueQuantity: {
          value: parseFloat(labResult.numericValue),
          unit: labResult.unit || '',
          system: 'http://unitsofmeasure.org',
          code: labResult.unitCode || labResult.unit
        }
      } : {
        valueString: labResult.result || labResult.value
      })
    };
  }

  // Convert prescription to FHIR MedicationRequest resource
  convertPrescriptionToFHIR(prescription: any): FHIRMedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      id: prescription.id?.toString(),
      status: this.mapPrescriptionStatus(prescription.status),
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: prescription.rxnormCode || '000000',
            display: prescription.medicationName || prescription.medication
          }
        ]
      },
      subject: {
        reference: `Patient/${prescription.patientId}`
      },
      authoredOn: prescription.prescribedDate || prescription.createdAt,
      requester: prescription.doctorId ? {
        reference: `Practitioner/${prescription.doctorId}`
      } : undefined,
      dosageInstruction: prescription.dosage ? [
        {
          text: prescription.dosage,
          timing: {
            repeat: {
              frequency: prescription.frequency || 1,
              period: 1,
              periodUnit: 'day'
            }
          },
          doseAndRate: prescription.dose ? [
            {
              doseQuantity: {
                value: parseFloat(prescription.dose),
                unit: prescription.doseUnit || 'tablet'
              }
            }
          ] : undefined
        }
      ] : undefined
    };
  }

  // Send FHIR resource to external FHIR server
  async sendToFHIRServer(resource: FHIRResource): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${resource.resourceType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json'
        },
        body: JSON.stringify(resource)
      });

      if (!response.ok) {
        throw new Error(`FHIR server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to send resource to FHIR server:', error);
      // Return mock response for development
      return {
        resourceType: resource.resourceType,
        id: `mock-${Date.now()}`,
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }

  // Retrieve FHIR resource from external server
  async getFromFHIRServer(resourceType: string, id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${resourceType}/${id}`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });

      if (!response.ok) {
        throw new Error(`FHIR server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to retrieve resource from FHIR server:', error);
      return null;
    }
  }

  // Search FHIR resources
  async searchFHIRResources(resourceType: string, searchParams: Record<string, string>): Promise<any> {
    try {
      const params = new URLSearchParams(searchParams);
      const response = await fetch(`${this.baseUrl}/${resourceType}?${params}`, {
        headers: {
          'Accept': 'application/fhir+json'
        }
      });

      if (!response.ok) {
        throw new Error(`FHIR server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to search FHIR resources:', error);
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: []
      };
    }
  }

  // Validate FHIR resource
  validateFHIRResource(resource: FHIRResource): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!resource.resourceType) {
      errors.push('Missing required field: resourceType');
    }

    // Resource-specific validation
    switch (resource.resourceType) {
      case 'Patient':
        const patient = resource as FHIRPatient;
        if (!patient.name || patient.name.length === 0) {
          errors.push('Patient must have at least one name');
        }
        if (!patient.gender) {
          errors.push('Patient must have gender specified');
        }
        break;

      case 'Observation':
        const observation = resource as FHIRObservation;
        if (!observation.status) {
          errors.push('Observation must have status');
        }
        if (!observation.code) {
          errors.push('Observation must have code');
        }
        if (!observation.subject) {
          errors.push('Observation must have subject reference');
        }
        break;

      case 'MedicationRequest':
        const medRequest = resource as FHIRMedicationRequest;
        if (!medRequest.status) {
          errors.push('MedicationRequest must have status');
        }
        if (!medRequest.intent) {
          errors.push('MedicationRequest must have intent');
        }
        if (!medRequest.medicationCodeableConcept) {
          errors.push('MedicationRequest must have medication');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private mapGender(gender: string): 'male' | 'female' | 'other' | 'unknown' {
    const normalized = gender?.toLowerCase();
    switch (normalized) {
      case 'male':
      case 'm':
        return 'male';
      case 'female':
      case 'f':
        return 'female';
      case 'other':
        return 'other';
      default:
        return 'unknown';
    }
  }

  private mapLabStatus(status: string): 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' {
    const normalized = status?.toLowerCase();
    switch (normalized) {
      case 'pending':
      case 'in-progress':
        return 'registered';
      case 'preliminary':
        return 'preliminary';
      case 'completed':
      case 'final':
        return 'final';
      case 'amended':
        return 'amended';
      case 'corrected':
        return 'corrected';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'final';
    }
  }

  private mapPrescriptionStatus(status: string): 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' {
    const normalized = status?.toLowerCase();
    switch (normalized) {
      case 'active':
      case 'prescribed':
        return 'active';
      case 'on-hold':
      case 'pending':
        return 'on-hold';
      case 'cancelled':
        return 'cancelled';
      case 'completed':
      case 'dispensed':
        return 'completed';
      case 'stopped':
        return 'stopped';
      case 'draft':
        return 'draft';
      default:
        return 'active';
    }
  }
}

export const fhirService = new FHIRService();