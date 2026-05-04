import { Request, Response, NextFunction } from 'express';
import { eq, and, like, or, sql, desc, asc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { patients } from '../models/patients.model';
import { vitals } from '../models/vitals.model';
import { patientAllergies } from '../models/patient-allergies.model';
import { patientConditions } from '../models/patient-conditions.model';
import { appointments } from '../models/appointments.model';
import { consultations } from '../models/consultations.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError, ConflictError, validateRequired, validatePhone } from '../utils/errors.util';

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const {
      firstName,
      middleName,
      lastName,
      email,
      gender,
      dob,
      dateOfBirth,
      maritalStatus,
      occupation,
      phone,
      alternatePhone,
      address,
      emergencyContact,
      emergencyContactPhone,
      emergencyContactRelationship,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
      nextOfKinAddress,
      bloodGroup,
      genotype,
      knownAllergies,
      chronicConditions,
      currentMedications,
      registrationType,
      visitReason,
      serviceNeeded,
      visitPriority,
      paymentCategory,
      hmoProvider,
      hmoNumber,
      consentToTreatment,
      consentToDataProcessing,
      smsConsent
    } = req.body;

    validateRequired(req.body, ['firstName', 'lastName']);
    
    if (phone && !validatePhone(phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    // Generate unique patient code with retry logic
    let patientCode: string;
    let attempts = 0;
    do {
      patientCode = `P${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      const existing = await db.select().from(patients).where(eq(patients.patientCode, patientCode)).limit(1);
      if (existing.length === 0) break;
      attempts++;
    } while (attempts < 3);

    if (attempts >= 3) {
      throw new ConflictError('Unable to generate unique patient code');
    }

    const [newPatient] = await db.insert(patients).values({
      facilityId,
      patientCode,
      firstName,
      middleName,
      lastName,
      email,
      gender,
      dob: dob || dateOfBirth || null,
      maritalStatus,
      occupation,
      phone,
      alternatePhone,
      address,
      emergencyContact,
      emergencyContactPhone,
      emergencyContactRelationship,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
      nextOfKinAddress,
      bloodGroup,
      genotype,
      knownAllergies,
      chronicConditions,
      currentMedications,
      registrationType,
      visitReason,
      serviceNeeded,
      visitPriority,
      paymentCategory,
      hmoProvider,
      hmoNumber,
      consentToTreatment: !!consentToTreatment,
      consentToDataProcessing: !!consentToDataProcessing,
      smsConsent: !!smsConsent
    } as any).returning();

    logger.info(`Patient created: ${patientCode} at facility ${facilityId}`);
    successResponse(res, 'Patient created successfully', { patient: newPatient }, 201);
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { search, limit = 100, offset = 0, sortBy = 'createdAt', sortOrder = 'desc', bloodGroup, gender } = req.query;
    
    const validLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
    const validOffset = Math.max(Number(offset) || 0, 0);

    const conditions = [eq(patients.facilityId, facilityId)];

    if (search) {
      conditions.push(or(
        like(patients.firstName, `%${search}%`),
        like(patients.lastName, `%${search}%`),
        like(patients.patientCode, `%${search}%`),
        like(patients.phone, `%${search}%`)
      ) as any);
    }
    if (bloodGroup) conditions.push(eq(patients.bloodGroup, bloodGroup as string));
    if (gender) conditions.push(eq(patients.gender, gender as string));

    const whereClause = and(...conditions);
    const orderColumn = sortBy === 'name' ? patients.firstName : patients.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const [patientList, [{ count }]] = await Promise.all([
      db.select({
        id: patients.id,
        patientCode: patients.patientCode,
        firstName: patients.firstName,
        middleName: patients.middleName,
        lastName: patients.lastName,
        gender: patients.gender,
        dob: sql<string>`to_char(${patients.dob}, 'YYYY-MM-DD')`,
        phone: patients.phone,
        bloodGroup: patients.bloodGroup,
        visitPriority: patients.visitPriority,
        paymentCategory: patients.paymentCategory,
        createdAt: sql<string>`to_char(${patients.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(patients).where(whereClause).orderBy(orderDirection).limit(validLimit).offset(validOffset),
      db.select({ count: sql<number>`count(*)::int` }).from(patients).where(whereClause)
    ]);
    
    successResponse(res, 'Patients retrieved successfully', { patients: patientList, total: count });
  } catch (error) {
    logger.error('Get patients error:', error);
    next(error);
  }
};

export const getPatientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;

    if (!id || id.length < 10) {
      throw new ValidationError('Invalid patient ID format');
    }

    const [patient] = await db.select({
      id: patients.id,
      facilityId: patients.facilityId,
      patientCode: patients.patientCode,
      firstName: patients.firstName,
      middleName: patients.middleName,
      lastName: patients.lastName,
      email: patients.email,
      gender: patients.gender,
      dob: sql<string>`to_char(${patients.dob}, 'YYYY-MM-DD')`,
      maritalStatus: patients.maritalStatus,
      occupation: patients.occupation,
      phone: patients.phone,
      alternatePhone: patients.alternatePhone,
      address: patients.address,
      emergencyContact: patients.emergencyContact,
      emergencyContactPhone: patients.emergencyContactPhone,
      emergencyContactRelationship: patients.emergencyContactRelationship,
      nextOfKinName: patients.nextOfKinName,
      nextOfKinPhone: patients.nextOfKinPhone,
      nextOfKinRelationship: patients.nextOfKinRelationship,
      nextOfKinAddress: patients.nextOfKinAddress,
      bloodGroup: patients.bloodGroup,
      genotype: patients.genotype,
      knownAllergies: patients.knownAllergies,
      chronicConditions: patients.chronicConditions,
      currentMedications: patients.currentMedications,
      registrationType: patients.registrationType,
      visitReason: patients.visitReason,
      serviceNeeded: patients.serviceNeeded,
      visitPriority: patients.visitPriority,
      paymentCategory: patients.paymentCategory,
      hmoProvider: patients.hmoProvider,
      hmoNumber: patients.hmoNumber,
      consentToTreatment: patients.consentToTreatment,
      consentToDataProcessing: patients.consentToDataProcessing,
      smsConsent: patients.smsConsent,
      createdAt: sql<string>`to_char(${patients.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      updatedAt: sql<string>`to_char(${patients.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    }).from(patients)
      .where(and(
        eq(patients.id, id),
        eq(patients.facilityId, facilityId)
      )).limit(1);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    successResponse(res, 'Patient retrieved successfully', { patient });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      throw new ValidationError('Patient ID is required');
    }

    if (updateData.phone && !validatePhone(updateData.phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    // Remove sensitive fields that shouldn't be updated
    const { patientCode, facilityId: _, ...safeUpdateData } = updateData;

    const [updatedPatient] = await db.update(patients)
      .set({ ...safeUpdateData, updatedAt: new Date() })
      .where(and(
        eq(patients.id, id),
        eq(patients.facilityId, facilityId)
      ))
      .returning();

    if (!updatedPatient) {
      throw new NotFoundError('Patient');
    }

    logger.info(`Patient updated: ${id} at facility ${facilityId}`);
    successResponse(res, 'Patient updated successfully', { patient: updatedPatient });
  } catch (error) {
    next(error);
  }
};

export const getPatientMedicalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;

    const [patient] = await db.select({ id: patients.id }).from(patients)
      .where(and(eq(patients.id, id), eq(patients.facilityId, facilityId))).limit(1);

    if (!patient) {
      throw new NotFoundError('Patient');
    }

    const [allergies, conditions, recentVitals, recentConsultations] = await Promise.all([
      db.select({
        id: patientAllergies.id,
        patientId: patientAllergies.patientId,
        allergen: patientAllergies.allergen,
        allergenType: patientAllergies.allergenType,
        severity: patientAllergies.severity,
        reaction: patientAllergies.reaction,
        createdAt: sql<string>`to_char(${patientAllergies.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(patientAllergies).where(eq(patientAllergies.patientId, id)),
      db.select({
        id: patientConditions.id,
        patientId: patientConditions.patientId,
        condition: patientConditions.condition,
        isActive: patientConditions.isActive,
        diagnosedDate: sql<string>`to_char(${patientConditions.diagnosedDate}, 'YYYY-MM-DD')`,
        notes: patientConditions.notes,
        createdAt: sql<string>`to_char(${patientConditions.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(patientConditions).where(eq(patientConditions.patientId, id)),
      db.select({
        id: vitals.id,
        patientId: vitals.patientId,
        bloodPressure: vitals.bloodPressure,
        temperature: vitals.temperature,
        pulse: vitals.pulse,
        respiration: vitals.respiration,
        weight: vitals.weight,
        height: vitals.height,
        recordedAt: sql<string>`to_char(${vitals.recordedAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        createdAt: sql<string>`to_char(${vitals.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(vitals).where(eq(vitals.patientId, id)).orderBy(desc(vitals.createdAt)).limit(5),
      db.select({
        id: consultations.id,
        patientId: consultations.patientId,
        doctorId: consultations.doctorId,
        chiefComplaint: consultations.chiefComplaint,
        diagnosis: consultations.diagnosis,
        notes: consultations.notes,
        status: consultations.status,
        consultationDate: sql<string>`to_char(${consultations.consultationDate}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        createdAt: sql<string>`to_char(${consultations.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(consultations).where(eq(consultations.patientId, id)).orderBy(desc(consultations.createdAt)).limit(10)
    ]);

    successResponse(res, 'Medical history retrieved', {
      patient,
      allergies,
      conditions,
      recentVitals,
      recentConsultations
    });
  } catch (error) {
    next(error);
  }
};

export const addPatientVitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { temperature, bloodPressureSystolic, bloodPressureDiastolic, heartRate, respiratoryRate, oxygenSaturation, weight, height, notes } = req.body;

    const [newVitals] = await db.insert(vitals).values({
      patientId: id,
      temperature: temperature || null,
      bloodPressure: (bloodPressureSystolic && bloodPressureDiastolic) ? `${bloodPressureSystolic}/${bloodPressureDiastolic}` : null,
      pulse: heartRate || null,
      respiration: respiratoryRate || null,
      weight: weight || null,
      height: height || null
    } as any).returning();

    // Check for critical vitals
    const criticalAlerts = [];
    if (temperature && (temperature > 38.5 || temperature < 35)) {
      criticalAlerts.push(`Critical temperature: ${temperature}°C`);
    }
    if (bloodPressureSystolic && bloodPressureSystolic > 180) {
      criticalAlerts.push(`Critical high blood pressure: ${bloodPressureSystolic}/${bloodPressureDiastolic}`);
    }
    if (heartRate && (heartRate > 120 || heartRate < 50)) {
      criticalAlerts.push(`Critical heart rate: ${heartRate} bpm`);
    }
    if (oxygenSaturation && oxygenSaturation < 90) {
      criticalAlerts.push(`Critical oxygen saturation: ${oxygenSaturation}%`);
    }

    successResponse(res, 'Vitals recorded successfully', { vitals: newVitals, criticalAlerts }, 201);
  } catch (error) {
    next(error);
  }
};

export const addPatientAllergy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { allergen, severity, reaction, notes } = req.body;

    validateRequired(req.body, ['allergen', 'severity']);

    const [newAllergy] = await db.insert(patientAllergies).values({
      patientId: id,
      allergen,
      allergenType: 'unknown',
      severity,
      reaction
    } as any).returning();

    logger.info(`Allergy added for patient: ${id}`);
    successResponse(res, 'Allergy added successfully', { allergy: newAllergy }, 201);
  } catch (error) {
    next(error);
  }
};

export const addPatientCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { condition, diagnosedDate, status, notes } = req.body;

    validateRequired(req.body, ['condition']);

    const [newCondition] = await db.insert(patientConditions).values({
      patientId: id,
      condition,
      diagnosedDate: diagnosedDate ? new Date(diagnosedDate) : null,
      isActive: status !== 'inactive',
      notes
    } as any).returning();

    logger.info(`Condition added for patient: ${id}`);
    successResponse(res, 'Condition added successfully', { condition: newCondition }, 201);
  } catch (error) {
    next(error);
  }
};

export const getPatientStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const [totalPatients] = await db.select({ count: sql<number>`count(*)` })
      .from(patients).where(eq(patients.facilityId, facilityId));

    const [newPatientsThisMonth] = await db.select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(
        eq(patients.facilityId, facilityId),
        sql`${patients.createdAt} >= date_trunc('month', current_date)`
      ));

    const genderStats = await db.select({
      gender: patients.gender,
      count: sql<number>`count(*)`
    })
    .from(patients)
    .where(eq(patients.facilityId, facilityId))
    .groupBy(patients.gender);

    const bloodGroupStats = await db.select({
      bloodGroup: patients.bloodGroup,
      count: sql<number>`count(*)`
    })
    .from(patients)
    .where(eq(patients.facilityId, facilityId))
    .groupBy(patients.bloodGroup);

    successResponse(res, 'Patient statistics retrieved', {
      totalPatients: totalPatients.count,
      newPatientsThisMonth: newPatientsThisMonth.count,
      genderStats,
      bloodGroupStats
    });
  } catch (error) {
    next(error);
  }
};
export const getPatientVitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    const { fromDate, toDate, limit = 50 } = req.query;

    const [patientCheck] = await db.select({ id: patients.id }).from(patients)
      .where(and(eq(patients.id, id), eq(patients.facilityId, facilityId))).limit(1);

    if (!patientCheck) {
      throw new NotFoundError('Patient');
    }

    const patientVitals = await db.select({
        id: vitals.id,
        patientId: vitals.patientId,
        bloodPressure: vitals.bloodPressure,
        temperature: vitals.temperature,
        pulse: vitals.pulse,
        respiration: vitals.respiration,
        weight: vitals.weight,
        height: vitals.height,
        recordedAt: sql<string>`to_char(${vitals.recordedAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        createdAt: sql<string>`to_char(${vitals.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
      }).from(vitals).where(eq(vitals.patientId, id))
      .orderBy(desc(vitals.createdAt))
      .limit(Math.min(Number(limit) || 50, 100));

    successResponse(res, 'Patient vitals retrieved successfully', { vitals: patientVitals });
  } catch (error) {
    next(error);
  }
};
