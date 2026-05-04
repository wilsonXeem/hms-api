import { Router, Request, Response, NextFunction } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { admissions } from '../models/admissions.model';
import { patients } from '../models/patients.model';
import { vitals } from '../models/vitals.model';
import { users } from '../models/users.model';
import { wards } from '../models/wards.model';
import { beds } from '../models/beds.model';
import { prescriptions } from '../models/prescriptions.model';
import { prescriptionItems } from '../models/prescription-items.model';
import { patientAllergies } from '../models/patient-allergies.model';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { successResponse } from '../utils/response.util';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['nurse', 'admin']));

// GET /api/nurse/dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [admittedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(eq(admissions.facilityId, facilityId), eq(admissions.status, 'admitted')));

    const [admittedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.facilityId, facilityId),
        eq(admissions.status, 'admitted'),
        sql`${admissions.admissionDate} >= ${today}`
      ));

    const [dischargedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissions)
      .where(and(
        eq(admissions.facilityId, facilityId),
        eq(admissions.status, 'discharged'),
        sql`${admissions.dischargeDate} >= ${today}`
      ));

    const [vitalsToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vitals)
      .where(sql`${vitals.recordedAt} >= ${today}`);

    const recentAdmissions = await db.select({
      id: admissions.id,
      admissionNumber: admissions.admissionNumber,
      patientId: patients.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      wardName: wards.name,
      bedNumber: beds.bedNumber,
      admissionDate: sql<string>`${admissions.admissionDate}::text`,
      admissionType: admissions.admissionType,
      priority: admissions.priority,
    })
    .from(admissions)
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(wards, eq(admissions.wardId, wards.id))
    .leftJoin(beds, eq(admissions.bedId, beds.id))
    .where(and(eq(admissions.facilityId, facilityId), eq(admissions.status, 'admitted')))
    .orderBy(desc(admissions.admissionDate))
    .limit(8);

    successResponse(res, 'Nurse dashboard data retrieved', {
      stats: {
        currentlyAdmitted: Number(admittedCount?.count || 0),
        admittedToday: Number(admittedToday?.count || 0),
        dischargedToday: Number(dischargedToday?.count || 0),
        vitalsRecordedToday: Number(vitalsToday?.count || 0),
      },
      recentAdmissions,
    });
  } catch (error) { next(error); }
});

// GET /api/nurse/ward-patients
router.get('/ward-patients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { wardId } = req.query;

    const conditions: any[] = [
      eq(admissions.facilityId, facilityId),
      eq(admissions.status, 'admitted'),
    ];
    if (wardId) conditions.push(eq(admissions.wardId, wardId as string));

    const wardPatients = await db.select({
      admissionId: admissions.id,
      admissionNumber: admissions.admissionNumber,
      patientId: patients.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientCode: patients.patientCode,
      gender: patients.gender,
      phone: patients.phone,
      bloodGroup: patients.bloodGroup,
      wardName: wards.name,
      bedNumber: beds.bedNumber,
      admissionDate: sql<string>`${admissions.admissionDate}::text`,
      admissionType: admissions.admissionType,
      admissionReason: admissions.admissionReason,
      priority: admissions.priority,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      dateOfBirth: sql<string>`${patients.dob}::text`,
    })
    .from(admissions)
    .leftJoin(patients, eq(admissions.patientId, patients.id))
    .leftJoin(wards, eq(admissions.wardId, wards.id))
    .leftJoin(beds, eq(admissions.bedId, beds.id))
    .leftJoin(users, eq(admissions.admittingDoctorId, users.id))
    .where(and(...conditions))
    .orderBy(wards.name, beds.bedNumber);

    successResponse(res, 'Ward patients retrieved', { patients: wardPatients });
  } catch (error) { next(error); }
});

// GET /api/nurse/patients/:patientId/vitals
router.get('/patients/:patientId/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const patientVitals = await db.select({
      id: vitals.id,
      bloodPressure: vitals.bloodPressure,
      temperature: vitals.temperature,
      pulse: vitals.pulse,
      respiration: vitals.respiration,
      weight: vitals.weight,
      height: vitals.height,
      recordedAt: sql<string>`${vitals.recordedAt}::text`,
      recordedBy: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(vitals)
    .leftJoin(users, eq(vitals.recordedBy, users.id))
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(20);

    successResponse(res, 'Patient vitals retrieved', { vitals: patientVitals });
  } catch (error) { next(error); }
});

// POST /api/nurse/patients/:patientId/vitals
router.post('/patients/:patientId/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const recordedBy = req.user!.id;
    const { bloodPressure, temperature, pulse, respiration, weight, height } = req.body;

    const [vital] = await db.insert(vitals).values({
      patientId,
      recordedBy,
      bloodPressure,
      temperature,
      pulse,
      respiration,
      weight,
      height,
    }).returning();

    successResponse(res, 'Vitals recorded successfully', { vital }, 201);
  } catch (error) { next(error); }
});

// GET /api/nurse/patients/:patientId/care
router.get('/patients/:patientId/care', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const [patient] = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      patientCode: patients.patientCode,
      dateOfBirth: sql<string>`${patients.dob}::text`,
      gender: patients.gender,
      bloodGroup: patients.bloodGroup,
      phone: patients.phone,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

    const recentVitals = await db.select({
      id: vitals.id,
      bloodPressure: vitals.bloodPressure,
      temperature: vitals.temperature,
      pulse: vitals.pulse,
      respiration: vitals.respiration,
      weight: vitals.weight,
      height: vitals.height,
      recordedAt: sql<string>`${vitals.recordedAt}::text`,
      recordedBy: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(vitals)
    .leftJoin(users, eq(vitals.recordedBy, users.id))
    .where(eq(vitals.patientId, patientId))
    .orderBy(desc(vitals.recordedAt))
    .limit(5);

    const allergyList = await db.select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId));

    const activePrescriptions = await db.select({
      id: prescriptions.id,
      remarks: prescriptions.remarks,
      status: prescriptions.status,
      createdAt: sql<string>`${prescriptions.createdAt}::text`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(prescriptions)
    .leftJoin(users, eq(prescriptions.doctorId, users.id))
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, 'active')))
    .orderBy(desc(prescriptions.createdAt))
    .limit(5);

    // Get items for each prescription
    const prescriptionIds = activePrescriptions.map(p => p.id);
    let items: any[] = [];
    if (prescriptionIds.length > 0) {
      items = await db.select()
        .from(prescriptionItems)
        .where(sql`${prescriptionItems.prescriptionId} = ANY(${prescriptionIds})`);
    }

    const prescriptionsWithItems = activePrescriptions.map(p => ({
      ...p,
      items: items.filter(i => i.prescriptionId === p.id),
    }));

    successResponse(res, 'Patient care data retrieved', {
      patient,
      recentVitals,
      allergies: allergyList,
      activePrescriptions: prescriptionsWithItems,
    });
  } catch (error) { next(error); }
});

export default router;
