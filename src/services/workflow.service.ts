import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { 
  patients, appointments, consultations, prescriptions, prescriptionItems,
  labRequests, payments, inventoryBatches, vitals
} from '../drizzle/schema';
import { labResults } from '../models/lab-results.model';
import { logger } from '../utils/logger.util';

export class WorkflowService {
  // Complete Patient Registration Workflow
  static async registerPatientWithAppointment(facilityId: string, patientData: any, appointmentData: any) {
    try {
      // Create patient
      const patientCode = `P${Date.now()}`;
      const [patient] = await db.insert(patients).values({
        facilityId,
        patientCode,
        ...patientData
      }).returning();

      // Create appointment
      const [appointment] = await db.insert(appointments).values({
        facilityId,
        patientId: patient.id,
        ...appointmentData,
        status: 'scheduled'
      }).returning();

      logger.info(`Patient registered with appointment: ${patient.patientCode}`);
      return { patient, appointment };
    } catch (error) {
      logger.error('Patient registration workflow error:', error);
      throw error;
    }
  }

  // Complete Consultation Workflow
  static async completeConsultation(consultationData: any) {
    try {
      const { patientId, doctorId, diagnosis, notes, vitalsData, prescriptionData, labTests } = consultationData;

      // Record vitals if provided
      let vitalsRecord = null;
      if (vitalsData) {
        [vitalsRecord] = await db.insert(vitals).values({
          patientId,
          recordedBy: doctorId,
          ...vitalsData
        }).returning();
      }

      // Create consultation
      const [consultation] = await db.insert(consultations).values({
        facilityId: consultationData.facilityId,
        patientId,
        doctorId,
        diagnosis,
        notes,
        recommendedTests: labTests ? JSON.stringify(labTests) : null
      }).returning();

      // Create prescription if provided
      let prescription = null;
      if (prescriptionData?.items?.length > 0) {
        [prescription] = await db.insert(prescriptions).values({
          consultationId: consultation.id,
          prescribedBy: doctorId,
          remarks: prescriptionData.remarks
        }).returning();

        // Add prescription items
        const prescriptionItemsData = prescriptionData.items.map((item: any) => ({
          prescriptionId: prescription.id,
          ...item
        }));
        await db.insert(prescriptionItems).values(prescriptionItemsData);
      }

      // Create lab requests if provided
      let labRequestsCreated = [];
      if (labTests?.length > 0) {
        const labRequestsData = labTests.map((testName: string) => ({
          consultationId: consultation.id,
          patientId,
          testName,
          requestedBy: doctorId,
          assignedLabId: consultationData.facilityId,
          status: 'pending'
        }));
        labRequestsCreated = await db.insert(labRequests).values(labRequestsData).returning();
      }

      // Update appointment status to completed
      if (consultationData.appointmentId) {
        await db.update(appointments)
          .set({ status: 'completed', notes: 'Consultation completed' })
          .where(eq(appointments.id, consultationData.appointmentId));
      }

      logger.info(`Consultation completed: ${consultation.id}`);
      return { consultation, prescription, labRequests: labRequestsCreated, vitals: vitalsRecord };
    } catch (error) {
      logger.error('Consultation workflow error:', error);
      throw error;
    }
  }

  // Prescription to Dispensation Workflow
  static async dispensePrescription(prescriptionId: string, pharmacistId: string) {
    try {
      // Get prescription details
      const prescriptionDetails = await db.select({
        prescriptionId: prescriptions.id,
        itemId: prescriptionItems.id,
        drugName: prescriptionItems.drugName,
        quantityPrescribed: prescriptionItems.quantityPrescribed
      })
      .from(prescriptions)
      .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
      .where(eq(prescriptions.id, prescriptionId));

      const dispensations = [];
      
      for (const item of prescriptionDetails) {
        // Find available batch
        const [availableBatch] = await db.select()
          .from(inventoryBatches)
          .where(and(
            sql`LOWER(item_name) LIKE LOWER(${'%' + item.drugName + '%'})`,
            sql`${inventoryBatches.quantity} >= ${item.quantityPrescribed}`
          ))
          .limit(1);

        if (!availableBatch) {
          throw new Error(`Insufficient stock for ${item.drugName}`);
        }

        // Create dispensation
        const [dispensation] = await db.insert({} as any).values({
          prescriptionItemId: item.itemId,
          pharmacistId,
          batchId: availableBatch.id,
          quantityDispensed: item.quantityPrescribed
        }).returning();

        // Update batch quantity
        await db.update(inventoryBatches)
          .set({ quantity: sql`${inventoryBatches.quantity} - ${item.quantityPrescribed}` })
          .where(eq(inventoryBatches.id, availableBatch.id));

        dispensations.push(dispensation);
      }

      logger.info(`Prescription dispensed: ${prescriptionId}`);
      return dispensations;
    } catch (error) {
      logger.error('Dispensation workflow error:', error);
      throw error;
    }
  }

  // Billing Workflow
  static async createBillForConsultation(consultationId: string, services: any[]) {
    try {
      // Get consultation details
      const [consultation] = await db.select({
        patientId: consultations.patientId,
        doctorId: consultations.doctorId
      })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

      if (!consultation) {
        throw new Error('Consultation not found');
      }

      let totalAmount = 0;
      const paymentRecords = [];

      // Create payment records for each service
      for (const service of services) {
        const referenceCode = `PAY${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        const [payment] = await db.insert(payments).values({
          patientId: consultation.patientId,
          department: service.department,
          referenceCode,
          amount: service.amount,
          method: 'pending',
          status: 'pending'
        }).returning();

        paymentRecords.push(payment);
        totalAmount += Number(service.amount);
      }

      logger.info(`Bill created for consultation: ${consultationId}, Total: ${totalAmount}`);
      return { payments: paymentRecords, totalAmount };
    } catch (error) {
      logger.error('Billing workflow error:', error);
      throw error;
    }
  }

  // Lab Result to Consultation Update Workflow
  static async processLabResult(requestId: string, resultData: any, uploadedBy: string) {
    try {
      // Get lab request details
      const [labRequest] = await db.select({
        consultationId: labRequests.consultationId,
        patientId: labRequests.patientId,
        testName: labRequests.testName
      })
      .from(labRequests)
      .where(eq(labRequests.id, requestId))
      .limit(1);

      if (!labRequest) {
        throw new Error('Lab request not found');
      }

      // Create lab result
      const [result] = await db.insert(labResults).values({
        requestId,
        patientId: labRequest.patientId,
        resultText: resultData.resultText,
        resultFileUrl: resultData.resultFileUrl,
        uploadedBy
      }).returning();

      // Update request status
      await db.update(labRequests)
        .set({ status: 'completed' })
        .where(eq(labRequests.id, requestId));

      // Update consultation with lab results (append to notes)
      const [consultation] = await db.select({ notes: consultations.notes })
        .from(consultations)
        .where(eq(consultations.id, labRequest.consultationId))
        .limit(1);

      const updatedNotes = `${consultation?.notes || ''}\n\nLab Result - ${labRequest.testName}: ${resultData.resultText}`;
      
      await db.update(consultations)
        .set({ notes: updatedNotes })
        .where(eq(consultations.id, labRequest.consultationId));

      logger.info(`Lab result processed: ${requestId}`);
      return result;
    } catch (error) {
      logger.error('Lab result workflow error:', error);
      throw error;
    }
  }

  // Appointment Scheduling with Availability Check
  static async scheduleAppointment(facilityId: string, appointmentData: any) {
    try {
      const { doctorId, appointmentDate, appointmentTime, duration = 30 } = appointmentData;

      // Check doctor availability
      const conflictingAppointments = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.appointmentTime, appointmentTime),
          sql`${appointments.status} != 'cancelled'`
        ));

      if (conflictingAppointments.length > 0) {
        throw new Error('Doctor not available at this time');
      }

      // Create appointment
      const [appointment] = await db.insert(appointments).values({
        ...appointmentData,
        status: 'scheduled'
      } as any).returning();

      logger.info(`Appointment scheduled: ${appointment.id}`);
      return appointment;
    } catch (error) {
      logger.error('Appointment scheduling workflow error:', error);
      throw error;
    }
  }

  // Emergency Patient Workflow
  static async processEmergencyPatient(facilityId: string, patientData: any, doctorId: string) {
    try {
      // Quick patient registration
      const patientCode = `E${Date.now()}`;
      const [patient] = await db.insert(patients).values({
        facilityId,
        patientCode,
        ...patientData
      }).returning();

      // Create immediate appointment
      const now = new Date();
      const [appointment] = await db.insert(appointments).values({
        patientId: patient.id,
        doctorId,
        appointmentDate: now.toISOString().split('T')[0],
        appointmentTime: now.toTimeString().slice(0, 5),
        reason: 'Emergency',
        status: 'in_progress'
      } as any).returning();

      // Create consultation
      const [consultation] = await db.insert(consultations).values({
        facilityId,
        patientId: patient.id,
        doctorId,
        diagnosis: 'Emergency - Initial Assessment',
        notes: 'Emergency patient - requires immediate attention'
      }).returning();

      logger.info(`Emergency patient processed: ${patient.patientCode}`);
      return { patient, appointment, consultation };
    } catch (error) {
      logger.error('Emergency patient workflow error:', error);
      throw error;
    }
  }
}