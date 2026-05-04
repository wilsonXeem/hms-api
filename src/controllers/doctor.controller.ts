import { Request, Response, NextFunction } from 'express';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { db, transaction } from '../config/db.config';
import { consultations } from '../models/consultations.model';
import { prescriptions } from '../models/prescriptions.model';
import { prescriptionItems } from '../models/prescription-items.model';
import { vitals } from '../models/vitals.model';
import { appointments } from '../models/appointments.model';
import { patients } from '../models/patients.model';
import { users } from '../models/users.model';
import { labRequests } from '../models/lab-requests.model';
import { inventoryItems } from '../models/inventory-items.model';
import { drugCatalog } from '../models/drug-catalog.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

const parseItemInstructions = (instructions: string | null) => {
  if (!instructions) return {};
  try {
    return JSON.parse(instructions);
  } catch {
    return { specialInstructions: instructions };
  }
};

const buildItemInstructions = (med: any) => JSON.stringify({
  dosageForm: med.dosageForm || med.form || '',
  route: med.route || '',
  timing: med.timing || '',
  indication: med.indication || '',
  specialInstructions: med.instructions || med.specialInstructions || '',
  asNeeded: !!med.asNeeded,
  maxDailyDose: med.maxDailyDose || ''
});

const normalizePrescriptionItems = (body: any) => {
  const sourceItems = Array.isArray(body.medications) ? body.medications : body.items;
  if (!Array.isArray(sourceItems)) return [];

  return sourceItems.map((med: any) => ({
    drugName: med.drugName,
    drugId: med.drugId || null,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    quantityPrescribed: med.quantityPrescribed ?? med.quantity ?? 0,
    instructions: buildItemInstructions(med)
  }));
};

export const getDoctorDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    
    const [todayAppointments, pendingConsultations, totalPatients] = await Promise.all([
      db.select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        appointmentDate: sql<string>`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD')`,
        appointmentTime: appointments.appointmentTime,
        reason: appointments.reason,
        status: appointments.status
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.doctorId, doctorId),
        sql`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD') = CURRENT_DATE::text`
      ))
      .orderBy(appointments.appointmentTime),
      
      db.select({ count: sql<number>`count(*)::int` })
      .from(consultations)
      .where(eq(consultations.doctorId, doctorId)),
      
      db.select({ count: sql<number>`count(DISTINCT ${consultations.patientId})::int` })
      .from(consultations)
      .where(eq(consultations.doctorId, doctorId))
    ]);
    
    successResponse(res, 'Doctor dashboard data retrieved', {
      todayAppointments,
      pendingConsultations: pendingConsultations[0].count,
      totalPatients: totalPatients[0].count
    });
  } catch (error) {
    logger.error('Get doctor dashboard error:', error);
    next(error);
  }
};

export const createConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const facilityId = req.facilityId!;
    const { patientId, chiefComplaint, diagnosis, notes, recommendedTests, followUpDate } = req.body;

    const [consultation] = await db.insert(consultations).values({
      facilityId,
      patientId,
      doctorId,
      chiefComplaint,
      diagnosis,
      notes,
      recommendedTests,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      consultationDate: new Date(),
      status: 'completed'
    } as any).returning();

    logger.info(`Consultation created: ${consultation.id} by doctor ${doctorId}`);
    successResponse(res, 'Consultation created successfully', { consultation }, 201);
  } catch (error) {
    logger.error('Create consultation error:', error);
    next(error);
  }
};

export const getConsultations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;

    const consultationList = await db.select({
      id: consultations.id,
      patientId: consultations.patientId,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      chiefComplaint: consultations.chiefComplaint,
      diagnosis: consultations.diagnosis,
      notes: consultations.notes,
      status: consultations.status,
      consultationDate: sql<string>`to_char(${consultations.consultationDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      createdAt: sql<string>`to_char(${consultations.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    })
    .from(consultations)
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .where(and(eq(consultations.doctorId, doctorId), eq(consultations.facilityId, facilityId)))
    .orderBy(desc(consultations.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Consultations retrieved successfully', { consultations: consultationList });
  } catch (error) {
    logger.error('Get consultations error:', error);
    next(error);
  }
};

export const createPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { consultationId } = req.body;
    const medications = normalizePrescriptionItems(req.body);
    
    if (!consultationId) {
      return errorResponse(res, 'Consultation ID is required', undefined, 400);
    }

    if (medications.length === 0) {
      return errorResponse(res, 'At least one medication is required', undefined, 400);
    }

    const [consultation] = await db.select({
      id: consultations.id,
      patientId: consultations.patientId
    })
    .from(consultations)
    .where(and(eq(consultations.id, consultationId), eq(consultations.doctorId, doctorId)))
    .limit(1);

    if (!consultation) {
      return errorResponse(res, 'Consultation not found or unauthorized', undefined, 404);
    }
    
    const result = await transaction(async (tx) => {
      const [prescription] = await tx.insert(prescriptions).values({
        consultationId,
        patientId: consultation.patientId,
        doctorId,
        prescribedBy: doctorId,
        remarks: req.body.remarks || req.body.instructions || null,
        status: 'pending'
      } as any).returning();
      
      const prescriptionItemsData = medications.map((med: any) => ({
        prescriptionId: prescription.id,
        drugName: med.drugName,
        drugId: med.drugId,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantityPrescribed: med.quantityPrescribed,
        instructions: med.instructions
      }));
      
      const items = await tx.insert(prescriptionItems)
        .values(prescriptionItemsData)
        .returning();
      
      return { prescription, items };
    });
    
    logger.info(`Prescription created: ${result.prescription.id} by doctor ${doctorId}`);
    successResponse(res, 'Prescription created successfully', result, 201);
  } catch (error) {
    logger.error('Create prescription error:', error);
    next(error);
  }
};

export const getPrescriptionDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { id } = req.params;

    const [prescription] = await db.select({
      id: prescriptions.id,
      consultationId: prescriptions.consultationId,
      patientId: prescriptions.patientId,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientPhone: patients.phone,
      patientDob: patients.dob,
      knownAllergies: patients.knownAllergies,
      chronicConditions: patients.chronicConditions,
      currentMedications: patients.currentMedications,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      diagnosis: consultations.diagnosis,
      consultationNotes: consultations.notes,
      remarks: prescriptions.remarks,
      status: prescriptions.status,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt
    })
    .from(prescriptions)
    .leftJoin(patients, eq(prescriptions.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.prescribedBy, users.id))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .where(and(eq(prescriptions.id, id), eq(prescriptions.prescribedBy, doctorId)))
    .limit(1);

    if (!prescription) {
      return errorResponse(res, 'Prescription not found or unauthorized', undefined, 404);
    }

    const items = await db.select({
      id: prescriptionItems.id,
      drugId: prescriptionItems.drugId,
      drugName: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      instructions: prescriptionItems.instructions
    })
    .from(prescriptionItems)
    .where(eq(prescriptionItems.prescriptionId, id));

    const enrichedItems = items.map(item => {
      const parsedInstructions = parseItemInstructions(item.instructions);
      return {
        ...item,
        ...parsedInstructions,
        instructions: parsedInstructions.specialInstructions || ''
      };
    });

    successResponse(res, 'Prescription retrieved successfully', {
      ...prescription,
      items: enrichedItems
    });
  } catch (error) {
    logger.error('Get prescription details error:', error);
    next(error);
  }
};

export const updatePrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { id } = req.params;
    const medications = normalizePrescriptionItems(req.body);

    if (medications.length === 0) {
      return errorResponse(res, 'At least one medication is required', undefined, 400);
    }

    const [existing] = await db.select().from(prescriptions)
      .where(and(eq(prescriptions.id, id), eq(prescriptions.prescribedBy, doctorId)))
      .limit(1);

    if (!existing) {
      return errorResponse(res, 'Prescription not found or unauthorized', undefined, 404);
    }

    if (!['pending', 'active'].includes(existing.status || '')) {
      return errorResponse(res, 'Only pending or active prescriptions can be edited', undefined, 400);
    }

    const result = await transaction(async (tx) => {
      const [updatedPrescription] = await tx.update(prescriptions)
        .set({
          remarks: req.body.remarks || req.body.instructions || null,
          updatedAt: new Date()
        })
        .where(eq(prescriptions.id, id))
        .returning();

      await tx.delete(prescriptionItems).where(eq(prescriptionItems.prescriptionId, id));

      const items = await tx.insert(prescriptionItems).values(medications.map((med: any) => ({
        prescriptionId: id,
        drugName: med.drugName,
        drugId: med.drugId,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantityPrescribed: med.quantityPrescribed,
        instructions: med.instructions
      }))).returning();

      return { prescription: updatedPrescription, items };
    });

    successResponse(res, 'Prescription updated successfully', result);
  } catch (error) {
    logger.error('Update prescription error:', error);
    next(error);
  }
};

export const cancelPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { id } = req.params;

    const [updatedPrescription] = await db.update(prescriptions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(prescriptions.id, id), eq(prescriptions.prescribedBy, doctorId)))
      .returning();

    if (!updatedPrescription) {
      return errorResponse(res, 'Prescription not found or unauthorized', undefined, 404);
    }

    successResponse(res, 'Prescription cancelled successfully', { prescription: updatedPrescription });
  } catch (error) {
    logger.error('Cancel prescription error:', error);
    next(error);
  }
};

export const recordVitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordedBy = req.user!.id;
    const { patientId, bloodPressure, temperature, pulse, respiration, weight, height } = req.body;

    const [vital] = await db.insert(vitals).values({
      patientId,
      recordedBy,
      bloodPressure,
      temperature,
      pulse,
      respiration,
      weight,
      height
    }).returning();

    logger.info(`Vitals recorded: ${vital.id} for patient ${patientId}`);
    successResponse(res, 'Vitals recorded successfully', { vital }, 201);
  } catch (error) {
    logger.error('Record vitals error:', error);
    next(error);
  }
};

export const getPatientVitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;

    const patientVitals = await db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .limit(Number(limit));

    successResponse(res, 'Patient vitals retrieved successfully', { vitals: patientVitals });
  } catch (error) {
    logger.error('Get patient vitals error:', error);
    next(error);
  }
};

export const getPrescriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const prescriptionList = await db.select().from(prescriptions)
      .where(eq(prescriptions.prescribedBy, doctorId))
      .limit(Number(limit))
      .offset(Number(offset));

    successResponse(res, 'Prescriptions retrieved successfully', { prescriptions: prescriptionList });
  } catch (error) {
    logger.error('Get prescriptions error:', error);
    next(error);
  }
};

// Appointment Management
export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientId, doctorId, appointmentDate, appointmentTime, duration, reason } = req.body;

    const [appointment] = await db.insert(appointments).values({
      facilityId,
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      duration,
      reason,
      status: 'scheduled'
    } as any).returning();

    logger.info(`Appointment created: ${appointment.id}`);
    successResponse(res, 'Appointment created successfully', { appointment }, 201);
  } catch (error) {
    logger.error('Create appointment error:', error);
    next(error);
  }
};

export const getDoctorAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { date, status, limit = 50, offset = 0 } = req.query;

    const conditions: any[] = [eq(appointments.doctorId, doctorId)];
    if (date) conditions.push(sql`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD') = ${date}`);
    if (status) conditions.push(eq(appointments.status, status as string));

    const appointmentList = await db.select({
      appointmentId: appointments.id,
      patientId: appointments.patientId,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      appointmentDate: sql<string>`to_char(${appointments.appointmentDate}, 'YYYY-MM-DD')`,
      appointmentTime: appointments.appointmentTime,
      duration: appointments.duration,
      reason: appointments.reason,
      status: appointments.status,
      notes: appointments.notes
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(appointments.appointmentDate, appointments.appointmentTime)
    .limit(Number(limit))
    .offset(Number(offset));

    // Map appointmentId -> id for frontend consistency
    const result = appointmentList.map(a => ({ ...a, id: a.appointmentId }));
    successResponse(res, 'Appointments retrieved successfully', { appointments: result });
  } catch (error) {
    logger.error('Get doctor appointments error:', error);
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const [updatedAppointment] = await db.update(appointments)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    if (!updatedAppointment) {
      return errorResponse(res, 'Appointment not found', undefined, 404);
    }

    logger.info(`Appointment status updated: ${id} to ${status}`);
    successResponse(res, 'Appointment status updated successfully', { appointment: updatedAppointment });
  } catch (error) {
    logger.error('Update appointment status error:', error);
    next(error);
  }
};

// Enhanced Patient Management
export const getPatientHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;

    // Get recent consultations with prescriptions
    const consultationHistory = await db.select({
      consultationId: consultations.id,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      diagnosis: consultations.diagnosis,
      notes: consultations.notes,
      recommendedTests: consultations.recommendedTests,
      consultationDate: consultations.createdAt,
      prescriptionId: prescriptions.id,
      prescriptionRemarks: prescriptions.remarks
    })
    .from(consultations)
    .leftJoin(users, eq(consultations.doctorId, users.id))
    .leftJoin(prescriptions, eq(consultations.id, prescriptions.consultationId))
    .where(eq(consultations.patientId, patientId))
    .orderBy(desc(consultations.createdAt))
    .limit(Number(limit));

    // Get recent vitals
    const recentVitals = await db.select().from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.createdAt))
      .limit(5);

    successResponse(res, 'Patient history retrieved successfully', {
      consultations: consultationHistory,
      vitals: recentVitals
    });
  } catch (error) {
    logger.error('Get patient history error:', error);
    next(error);
  }
};

export const createLabRequestFromConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedBy = req.user!.id;
    const facilityId = req.facilityId!;
    const { consultationId, patientId, tests } = req.body; // tests is array of test names

    const labRequestsData = tests.map((testName: string) => ({
      consultationId,
      patientId,
      testName,
      requestedBy,
      assignedLabId: facilityId,
      status: 'pending'
    }));

    const createdRequests = await db.insert(labRequests).values(labRequestsData).returning();

    logger.info(`Lab requests created: ${createdRequests.length} tests for consultation ${consultationId}`);
    successResponse(res, 'Lab requests created successfully', { requests: createdRequests }, 201);
  } catch (error) {
    logger.error('Create lab requests error:', error);
    next(error);
  }
};

export const getConsultationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const consultationDetails = await db.select({
      consultationId: consultations.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientId: consultations.patientId,
      patientCode: patients.patientCode,
      patientDob: patients.dob,
      patientGender: patients.gender,
      patientPhone: patients.phone,
      knownAllergies: patients.knownAllergies,
      chronicConditions: patients.chronicConditions,
      currentMedications: patients.currentMedications,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      diagnosis: consultations.diagnosis,
      notes: consultations.notes,
      recommendedTests: consultations.recommendedTests,
      consultationDate: consultations.createdAt
    })
    .from(consultations)
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(users, eq(consultations.doctorId, users.id))
    .where(eq(consultations.id, id))
    .limit(1);

    if (consultationDetails.length === 0) {
      return errorResponse(res, 'Consultation not found', undefined, 404);
    }

    // Get prescriptions for this consultation
    const prescriptionDetails = await db.select({
      prescriptionId: prescriptions.id,
      remarks: prescriptions.remarks,
      drugName: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      instructions: prescriptionItems.instructions
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .where(eq(prescriptions.consultationId, id));

    successResponse(res, 'Consultation details retrieved successfully', {
      consultation: consultationDetails[0],
      prescriptions: prescriptionDetails.map(item => {
        const parsedInstructions = parseItemInstructions(item.instructions);
        return {
          ...item,
          ...parsedInstructions,
          instructions: parsedInstructions.specialInstructions || ''
        };
      })
    });
  } catch (error) {
    logger.error('Get consultation details error:', error);
    next(error);
  }
};

export const getDoctorSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    
    const schedule = await db.select({
      appointmentId: appointments.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      appointmentTime: appointments.appointmentTime,
      duration: appointments.duration,
      reason: appointments.reason,
      status: appointments.status
    })
    .from(appointments)
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(
      eq(appointments.doctorId, doctorId),
      eq(appointments.appointmentDate, targetDate.toISOString().split('T')[0])
    ))
    .orderBy(appointments.appointmentTime);

    successResponse(res, 'Doctor schedule retrieved', { schedule, date: targetDate });
  } catch (error) {
    logger.error('Get doctor schedule error:', error);
    next(error);
  }
};

export const updateConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes, recommendedTests } = req.body;
    const doctorId = req.user!.id;

    const [updatedConsultation] = await db.update(consultations)
      .set({
        diagnosis,
        notes,
        recommendedTests: recommendedTests ? JSON.stringify(recommendedTests) : null
      })
      .where(and(
        eq(consultations.id, id),
        eq(consultations.doctorId, doctorId)
      ))
      .returning();

    if (!updatedConsultation) {
      return errorResponse(res, 'Consultation not found or unauthorized', undefined, 404);
    }

    logger.info(`Consultation updated: ${id} by doctor ${doctorId}`);
    successResponse(res, 'Consultation updated successfully', { consultation: updatedConsultation });
  } catch (error) {
    logger.error('Update consultation error:', error);
    next(error);
  }
};

export const getDoctorStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    const stats = await db.select({
      totalConsultations: sql<number>`COUNT(DISTINCT ${consultations.id})`,
      totalPrescriptions: sql<number>`COUNT(DISTINCT ${prescriptions.id})`,
      totalAppointments: sql<number>`COUNT(DISTINCT ${appointments.id})`,
      completedAppointments: sql<number>`COUNT(DISTINCT CASE WHEN ${appointments.status} = 'completed' THEN ${appointments.id} END)`
    })
    .from(consultations)
    .leftJoin(prescriptions, eq(consultations.id, prescriptions.consultationId))
    .leftJoin(appointments, eq(consultations.doctorId, appointments.doctorId))
    .where(and(
      eq(consultations.doctorId, doctorId),
      gte(consultations.createdAt, startDate)
    ));

    successResponse(res, 'Doctor statistics retrieved', { stats: stats[0], period });
  } catch (error) {
    logger.error('Get doctor stats error:', error);
    next(error);
  }
};

export const searchDrugs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { q } = req.query;

    if (!q || String(q).trim().length < 2) {
      return successResponse(res, 'Drug search results', { drugs: [] });
    }

    const query = `%${String(q).trim()}%`;

    // Search facility inventory first (drugs actually in stock)
    const inventoryResults = await db.select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      strength: sql<string>`null`,
      form: sql<string>`null`,
      category: inventoryItems.category,
      source: sql<string>`'inventory'`
    })
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`LOWER(${inventoryItems.name}) LIKE LOWER(${query})`
    ))
    .limit(10);

    // Also search drug catalog for broader coverage
    const catalogResults = await db.select({
      id: drugCatalog.id,
      name: drugCatalog.genericName,
      strength: drugCatalog.strength,
      form: drugCatalog.dosageForm,
      category: drugCatalog.category,
      source: sql<string>`'catalog'`
    })
    .from(drugCatalog)
    .where(and(
      eq(drugCatalog.isActive, true),
      sql`LOWER(${drugCatalog.genericName}) LIKE LOWER(${query}) OR LOWER(${drugCatalog.brandName}) LIKE LOWER(${query})`
    ))
    .limit(10);

    // Inventory results first, then catalog, deduplicated by name
    const seen = new Set<string>();
    const drugs = [...inventoryResults, ...catalogResults].filter(d => {
      const key = d.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    successResponse(res, 'Drug search results', { drugs });
  } catch (error) {
    logger.error('Search drugs error:', error);
    next(error);
  }
};

export const getDoctorLabResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const { labRequests } = await import('../models/lab-requests.model');
    const { labResults } = await import('../models/lab-results.model');

    const results = await db.select({
      id: labResults.id,
      requestId: labResults.requestId,
      patientId: labResults.patientId,
      testName: labRequests.testName,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      resultText: labResults.resultText,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      validationStatus: labResults.validationStatus,
      isCritical: labResults.isCritical,
      status: labRequests.status,
      priority: labRequests.priority,
      createdAt: sql<string>`to_char(${labResults.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    })
    .from(labResults)
    .innerJoin(labRequests, eq(labResults.requestId, labRequests.id))
    .leftJoin(patients, eq(labResults.patientId, patients.id))
    .where(eq(labRequests.requestedBy, doctorId))
    .orderBy(desc(labResults.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Lab results retrieved', { results });
  } catch (error) {
    logger.error('Get doctor lab results error:', error);
    next(error);
  }
};

export const getDoctorLabResultById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { labRequests } = await import('../models/lab-requests.model');
    const { labResults } = await import('../models/lab-results.model');

    const [result] = await db.select({
      id: labResults.id,
      requestId: labResults.requestId,
      patientId: labResults.patientId,
      testName: labRequests.testName,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      resultText: labResults.resultText,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      validationStatus: labResults.validationStatus,
      isCritical: labResults.isCritical,
      status: labRequests.status,
      priority: labRequests.priority,
      createdAt: sql<string>`to_char(${labResults.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    })
    .from(labResults)
    .innerJoin(labRequests, eq(labResults.requestId, labRequests.id))
    .leftJoin(patients, eq(labResults.patientId, patients.id))
    .where(eq(labResults.id, id))
    .limit(1);

    if (!result) {
      return errorResponse(res, 'Lab result not found', undefined, 404);
    }

    successResponse(res, 'Lab result retrieved', { result });
  } catch (error) {
    logger.error('Get lab result by id error:', error);
    next(error);
  }
};
