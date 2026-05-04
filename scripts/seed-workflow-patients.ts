import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { config } from '../src/config/app.config';
import { facilities } from '../src/models/facilities.model';
import { users } from '../src/models/users.model';
import { patients } from '../src/models/patients.model';
import { appointments } from '../src/models/appointments.model';
import { consultations } from '../src/models/consultations.model';
import { labRequests } from '../src/models/lab-requests.model';
import { prescriptions } from '../src/models/prescriptions.model';
import { prescriptionItems } from '../src/models/prescription-items.model';
import { admissions } from '../src/models/admissions.model';
import { payments } from '../src/models/payments.model';

const client = postgres(config.database.url, { prepare: false });
const db = drizzle(client);

const dateString = (daysFromToday: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
};

const timestamp = (daysFromToday: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date;
};

const patientSeeds = [
  {
    stage: 'Registered only',
    patientCode: 'OSH-PAT-001',
    firstName: 'Ifeoma',
    middleName: 'Ada',
    lastName: 'Okonkwo',
    email: 'ifeoma.okonkwo@example.com',
    gender: 'female',
    dob: '1991-05-12',
    maritalStatus: 'married',
    occupation: 'Trader',
    phone: '+2348011110001',
    alternatePhone: '+2348021110001',
    address: 'Uruagu Nnewi, Anambra State',
    emergencyContact: 'Chinedu Okonkwo',
    emergencyContactPhone: '+2348031110001',
    emergencyContactRelationship: 'Husband',
    nextOfKinName: 'Chinedu Okonkwo',
    nextOfKinPhone: '+2348031110001',
    nextOfKinRelationship: 'Husband',
    nextOfKinAddress: 'Uruagu Nnewi, Anambra State',
    bloodGroup: 'O+',
    genotype: 'AA',
    knownAllergies: 'No known drug allergies',
    chronicConditions: '',
    currentMedications: '',
    registrationType: 'outpatient',
    visitReason: 'New patient registration for general surgical review.',
    serviceNeeded: 'General Consultation',
    visitPriority: 'routine',
    paymentCategory: 'self_pay',
    consentToTreatment: true,
    consentToDataProcessing: true,
    smsConsent: true
  },
  {
    stage: 'Appointment booked',
    patientCode: 'OSH-PAT-002',
    firstName: 'Obinna',
    middleName: '',
    lastName: 'Eze',
    email: 'obinna.eze@example.com',
    gender: 'male',
    dob: '1984-09-24',
    maritalStatus: 'married',
    occupation: 'Business Owner',
    phone: '+2348011110002',
    address: 'Otolo Nnewi, Anambra State',
    emergencyContact: 'Ngozi Eze',
    emergencyContactPhone: '+2348031110002',
    emergencyContactRelationship: 'Wife',
    bloodGroup: 'A+',
    genotype: 'AS',
    knownAllergies: 'Penicillin',
    chronicConditions: 'Peptic ulcer disease',
    currentMedications: 'Omeprazole as needed',
    registrationType: 'surgical_endoscopy_booking',
    visitReason: 'Epigastric pain and recurrent indigestion.',
    serviceNeeded: 'Upper GI Endoscopy',
    visitPriority: 'routine',
    paymentCategory: 'self_pay',
    consentToTreatment: true,
    consentToDataProcessing: true,
    smsConsent: true
  },
  {
    stage: 'Consultation and lab pending',
    patientCode: 'OSH-PAT-003',
    firstName: 'Amaka',
    middleName: 'Nneka',
    lastName: 'Nwafor',
    email: 'amaka.nwafor@example.com',
    gender: 'female',
    dob: '1978-02-03',
    maritalStatus: 'widowed',
    occupation: 'Teacher',
    phone: '+2348011110003',
    address: 'Umudim Nnewi, Anambra State',
    emergencyContact: 'Kosiso Nwafor',
    emergencyContactPhone: '+2348031110003',
    emergencyContactRelationship: 'Daughter',
    bloodGroup: 'B+',
    genotype: 'AA',
    knownAllergies: 'Sulphur drugs',
    chronicConditions: 'Hypertension',
    currentMedications: 'Amlodipine 5mg daily',
    registrationType: 'outpatient',
    visitReason: 'Persistent abdominal pain with change in bowel habit.',
    serviceNeeded: 'Colonoscopy',
    visitPriority: 'urgent',
    paymentCategory: 'hmo',
    hmoProvider: 'SampleCare HMO',
    hmoNumber: 'SCHMO-1003',
    consentToTreatment: true,
    consentToDataProcessing: true,
    smsConsent: true
  },
  {
    stage: 'Prescription pending pharmacy',
    patientCode: 'OSH-PAT-004',
    firstName: 'Chukwuemeka',
    middleName: '',
    lastName: 'Ilo',
    email: 'chukwuemeka.ilo@example.com',
    gender: 'male',
    dob: '1996-11-17',
    maritalStatus: 'single',
    occupation: 'Engineer',
    phone: '+2348011110004',
    address: 'Nnewichi Nnewi, Anambra State',
    emergencyContact: 'Uchenna Ilo',
    emergencyContactPhone: '+2348031110004',
    emergencyContactRelationship: 'Brother',
    bloodGroup: 'AB+',
    genotype: 'AA',
    knownAllergies: '',
    chronicConditions: '',
    currentMedications: '',
    registrationType: 'outpatient',
    visitReason: 'Right lower abdominal pain and fever.',
    serviceNeeded: 'Laparoscopic Appendectomy',
    visitPriority: 'urgent',
    paymentCategory: 'corporate',
    hmoProvider: 'Ilo Engineering Ltd',
    hmoNumber: 'CORP-004',
    consentToTreatment: true,
    consentToDataProcessing: true,
    smsConsent: false
  },
  {
    stage: 'Admitted and billing active',
    patientCode: 'OSH-PAT-005',
    firstName: 'Ngozi',
    middleName: 'Uche',
    lastName: 'Okafor',
    email: 'ngozi.okafor@example.com',
    gender: 'female',
    dob: '1969-07-08',
    maritalStatus: 'married',
    occupation: 'Civil Servant',
    phone: '+2348011110005',
    address: 'Ozobulu Road Axis, Nnewi, Anambra State',
    emergencyContact: 'Patrick Okafor',
    emergencyContactPhone: '+2348031110005',
    emergencyContactRelationship: 'Husband',
    bloodGroup: 'O-',
    genotype: 'AS',
    knownAllergies: 'Chloroquine',
    chronicConditions: 'Type 2 diabetes',
    currentMedications: 'Metformin 500mg twice daily',
    registrationType: 'inpatient_referral',
    visitReason: 'Gallstone disease for laparoscopic cholecystectomy workup.',
    serviceNeeded: 'Laparoscopic Cholecystectomy',
    visitPriority: 'routine',
    paymentCategory: 'self_pay',
    consentToTreatment: true,
    consentToDataProcessing: true,
    smsConsent: true
  }
];

async function getRequiredContext() {
  const [facility] = await db.select().from(facilities).where(eq(facilities.isActive, true)).limit(1);
  if (!facility) throw new Error('No active facility found. Run npm run seed first.');

  const [doctor] = await db.select().from(users).where(and(
    eq(users.facilityId, facility.id),
    eq(users.role, 'doctor'),
    eq(users.isActive, true)
  )).limit(1);
  if (!doctor) throw new Error('No active doctor found. Run npm run seed first.');

  const [receptionist] = await db.select().from(users).where(and(
    eq(users.facilityId, facility.id),
    eq(users.role, 'receptionist'),
    eq(users.isActive, true)
  )).limit(1);

  return { facility, doctor, receptionist };
}

async function ensurePatient(facilityId: string, seed: any) {
  const [existing] = await db.select().from(patients).where(eq(patients.patientCode, seed.patientCode)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(patients).values({
    facilityId,
    ...seed
  } as any).returning();

  console.log(`✅ Patient seeded: ${created.patientCode} (${seed.stage})`);
  return created;
}

async function seedAppointment(facilityId: string, doctorId: string, patient: any, days: number, time: string, status = 'scheduled') {
  const [existing] = await db.select().from(appointments).where(and(
    eq(appointments.patientId, patient.id),
    eq(appointments.reason, patient.visitReason)
  )).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(appointments).values({
    facilityId,
    patientId: patient.id,
    doctorId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    email: patient.email,
    phone: patient.phone,
    appointmentDate: dateString(days),
    appointmentTime: time,
    duration: '30 minutes',
    reason: patient.visitReason,
    status
  } as any).returning();

  return created;
}

async function seedConsultation(facilityId: string, doctorId: string, patient: any, status: string, diagnosis: string) {
  const [existing] = await db.select().from(consultations).where(and(
    eq(consultations.patientId, patient.id),
    eq(consultations.chiefComplaint, patient.visitReason)
  )).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(consultations).values({
    facilityId,
    patientId: patient.id,
    doctorId,
    consultationType: 'outpatient',
    consultationDate: timestamp(0),
    chiefComplaint: patient.visitReason,
    diagnosis,
    notes: 'Seeded workflow patient for module testing.',
    status
  } as any).returning();

  return created;
}

async function seedWorkflowPatients() {
  console.log('🌱 Seeding five patient workflow records...');
  const { facility, doctor, receptionist } = await getRequiredContext();

  const seededPatients = [];
  for (const seed of patientSeeds) {
    seededPatients.push(await ensurePatient(facility.id, seed));
  }

  await seedAppointment(facility.id, doctor.id, seededPatients[1], 1, '09:00', 'scheduled');

  const labConsultation = await seedConsultation(
    facility.id,
    doctor.id,
    seededPatients[2],
    'in_progress',
    'Abdominal pain for investigation'
  );
  const [existingLabRequest] = await db.select().from(labRequests).where(and(
    eq(labRequests.patientId, seededPatients[2].id),
    eq(labRequests.testName, 'Full Blood Count')
  )).limit(1);
  if (!existingLabRequest) {
    await db.insert(labRequests).values({
      consultationId: labConsultation.id,
      patientId: seededPatients[2].id,
      testName: 'Full Blood Count',
      requestedBy: doctor.id,
      assignedLabId: facility.id,
      priority: 'urgent',
      status: 'pending'
    } as any);
  }

  const prescriptionConsultation = await seedConsultation(
    facility.id,
    doctor.id,
    seededPatients[3],
    'completed',
    'Suspected acute appendicitis'
  );
  const [existingPrescription] = await db.select().from(prescriptions).where(and(
    eq(prescriptions.patientId, seededPatients[3].id),
    eq(prescriptions.status, 'pending')
  )).limit(1);
  if (!existingPrescription) {
    const [prescription] = await db.insert(prescriptions).values({
      consultationId: prescriptionConsultation.id,
      patientId: seededPatients[3].id,
      doctorId: doctor.id,
      prescribedBy: doctor.id,
      remarks: 'Pre-operative medication pending pharmacy review.',
      status: 'pending'
    } as any).returning();

    await db.insert(prescriptionItems).values({
      prescriptionId: prescription.id,
      drugName: 'Ceftriaxone',
      dosage: '1g',
      frequency: '12 hourly',
      duration: '3 days',
      quantityPrescribed: '6',
      instructions: 'Review allergy history before dispensing.'
    } as any);
  }

  const [existingAdmission] = await db.select().from(admissions).where(eq(admissions.patientId, seededPatients[4].id)).limit(1);
  let admission = existingAdmission;
  if (!admission) {
    [admission] = await db.insert(admissions).values({
      facilityId: facility.id,
      patientId: seededPatients[4].id,
      admissionNumber: 'ADM-OSH-001',
      admissionType: 'inpatient',
      admissionDate: timestamp(0),
      admittingDoctorId: doctor.id,
      status: 'admitted',
      priority: 'routine',
      admissionReason: seededPatients[4].visitReason,
      totalCharges: '150000.00'
    } as any).returning();
  }

  const [existingPayment] = await db.select().from(payments).where(eq(payments.referenceCode, 'PAY-OSH-001')).limit(1);
  if (!existingPayment) {
    await db.insert(payments).values({
      facilityId: facility.id,
      patientId: seededPatients[4].id,
      admissionId: admission.id,
      department: 'Admissions',
      referenceCode: 'PAY-OSH-001',
      amount: '50000.00',
      method: 'cash',
      status: 'pending',
      approvedBy: receptionist?.id
    } as any);
  }

  console.log('\n🎉 Workflow patients ready:');
  seededPatients.forEach((patient, index) => {
    console.log(`  ${patient.patientCode}: ${patient.firstName} ${patient.lastName} — ${patientSeeds[index].stage}`);
  });
}

seedWorkflowPatients()
  .catch((error) => {
    console.error('❌ Workflow patient seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
