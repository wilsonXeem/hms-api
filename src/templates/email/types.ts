export interface AppointmentData {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  facilityName?: string;
}

export interface AppointmentRescheduleData {
  patientName: string;
  doctorName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
}

export interface LabResultData {
  patientName: string;
  testNames: string[];
  doctorName?: string;
  collectionDate?: string;
}

export interface CriticalResultData {
  doctorName: string;
  patientName: string;
  testName: string;
  result: string;
  normalRange?: string;
  urgencyLevel: 'high' | 'critical';
}

export interface PrescriptionData {
  patientName: string;
  medications: Array<{
    name: string;
    quantity: string;
    instructions?: string;
  }>;
  pharmacyName?: string;
  pickupInstructions?: string;
}

export interface MedicationReminderData {
  patientName: string;
  medicationName: string;
  dosage: string;
  nextDose: string;
  instructions?: string;
}

export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  footerText?: string;
}