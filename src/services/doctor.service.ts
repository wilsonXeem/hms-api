import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../config/database';
import { consultations, prescriptions, vitals, appointments, users, patients } from '../models/schema';

export class DoctorService {
  async getDoctorDashboard(doctorId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const [todayAppointments, totalPatients, pendingConsultations] = await Promise.all([
      db.select().from(appointments)
        .where(and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.appointmentDate, today)
        )),
      
      db.select().from(consultations)
        .where(eq(consultations.doctorId, doctorId)),
      
      db.select().from(consultations)
        .where(and(
          eq(consultations.doctorId, doctorId),
          eq(consultations.status, 'scheduled')
        ))
    ]);

    return {
      todayAppointments: todayAppointments.length,
      totalPatients: new Set(totalPatients.map(c => c.patientId)).size,
      pendingConsultations: pendingConsultations.length,
      recentActivity: await this.getRecentActivity(doctorId)
    };
  }

  async getDoctorStats(doctorId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [consultationsCount, prescriptionsCount, appointmentsCount] = await Promise.all([
      db.select().from(consultations)
        .where(and(
          eq(consultations.doctorId, doctorId),
          gte(consultations.createdAt, thirtyDaysAgo)
        )),
      
      db.select().from(prescriptions)
        .where(and(
          eq(prescriptions.doctorId, doctorId),
          gte(prescriptions.createdAt, thirtyDaysAgo)
        )),
      
      db.select().from(appointments)
        .where(and(
          eq(appointments.doctorId, doctorId),
          gte(appointments.createdAt, thirtyDaysAgo)
        ))
    ]);

    return {
      consultations: consultationsCount.length,
      prescriptions: prescriptionsCount.length,
      appointments: appointmentsCount.length
    };
  }

  async getDoctorSchedule(doctorId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    return await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, targetDate)
      ))
      .orderBy(appointments.appointmentTime);
  }

  async createConsultation(consultationData: any) {
    const [consultation] = await db.insert(consultations)
      .values({
        ...consultationData,
        status: 'in_progress'
      })
      .returning();

    return consultation;
  }

  async getConsultations(doctorId: string, filters: any = {}) {
    let query = db.select().from(consultations)
      .where(eq(consultations.doctorId, doctorId));

    if (filters.patientId) {
      query = query.where(eq(consultations.patientId, filters.patientId));
    }
    if (filters.status) {
      query = query.where(eq(consultations.status, filters.status));
    }
    if (filters.date) {
      query = query.where(eq(consultations.consultationDate, filters.date));
    }

    return await query;
  }

  async getConsultationDetails(consultationId: string, doctorId: string) {
    const [consultation] = await db.select()
      .from(consultations)
      .where(and(
        eq(consultations.id, consultationId),
        eq(consultations.doctorId, doctorId)
      ));

    if (!consultation) throw new Error('Consultation not found');
    return consultation;
  }

  async updateConsultation(consultationId: string, doctorId: string, updates: any) {
    const [consultation] = await db.update(consultations)
      .set(updates)
      .where(and(
        eq(consultations.id, consultationId),
        eq(consultations.doctorId, doctorId)
      ))
      .returning();

    if (!consultation) throw new Error('Consultation not found');
    return consultation;
  }

  async createPrescription(prescriptionData: any) {
    const [prescription] = await db.insert(prescriptions)
      .values({
        ...prescriptionData,
        status: 'active'
      })
      .returning();

    return prescription;
  }

  async getPrescriptions(doctorId: string, filters: any = {}) {
    let query = db.select().from(prescriptions)
      .where(eq(prescriptions.doctorId, doctorId));

    if (filters.patientId) {
      query = query.where(eq(prescriptions.patientId, filters.patientId));
    }
    if (filters.consultationId) {
      query = query.where(eq(prescriptions.consultationId, filters.consultationId));
    }

    return await query;
  }

  async createAppointment(appointmentData: any) {
    const [appointment] = await db.insert(appointments)
      .values({
        ...appointmentData,
        status: 'scheduled'
      })
      .returning();

    return appointment;
  }

  async getDoctorAppointments(doctorId: string, filters: any = {}) {
    let query = db.select().from(appointments)
      .where(eq(appointments.doctorId, doctorId));

    if (filters.date) {
      query = query.where(eq(appointments.appointmentDate, filters.date));
    }
    if (filters.status) {
      query = query.where(eq(appointments.status, filters.status));
    }

    return await query;
  }

  async updateAppointmentStatus(appointmentId: string, doctorId: string, status: string, notes?: string) {
    const [appointment] = await db.update(appointments)
      .set({ status, notes })
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.doctorId, doctorId)
      ))
      .returning();

    if (!appointment) throw new Error('Appointment not found');
    return appointment;
  }

  async recordVitals(vitalsData: any) {
    const [vital] = await db.insert(vitals)
      .values(vitalsData)
      .returning();

    return vital;
  }

  async getPatientVitals(patientId: string, fromDate?: string, toDate?: string) {
    let query = db.select().from(vitals)
      .where(eq(vitals.patientId, patientId));

    if (fromDate) {
      query = query.where(gte(vitals.recordedAt, new Date(fromDate)));
    }
    if (toDate) {
      query = query.where(lte(vitals.recordedAt, new Date(toDate)));
    }

    return await query.orderBy(vitals.recordedAt);
  }

  async getPatientHistory(patientId: string, doctorId: string) {
    const [consultationsHistory, prescriptionsHistory, vitalsHistory] = await Promise.all([
      db.select().from(consultations)
        .where(and(
          eq(consultations.patientId, patientId),
          eq(consultations.doctorId, doctorId)
        ))
        .orderBy(consultations.createdAt),
      
      db.select().from(prescriptions)
        .where(and(
          eq(prescriptions.patientId, patientId),
          eq(prescriptions.doctorId, doctorId)
        ))
        .orderBy(prescriptions.createdAt),
      
      db.select().from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(vitals.recordedAt)
    ]);

    return {
      consultations: consultationsHistory,
      prescriptions: prescriptionsHistory,
      vitals: vitalsHistory
    };
  }

  async createLabRequestFromConsultation(consultationId: string, labTests: any[]) {
    // This would integrate with lab service
    const labRequests = [];
    
    for (const test of labTests) {
      // Create lab request logic here
      labRequests.push({
        consultationId,
        testType: test.type,
        status: 'pending',
        requestedAt: new Date()
      });
    }

    return labRequests;
  }

  private async getRecentActivity(doctorId: string) {
    const recentConsultations = await db.select()
      .from(consultations)
      .where(eq(consultations.doctorId, doctorId))
      .orderBy(consultations.createdAt)
      .limit(5);

    return recentConsultations.map(c => ({
      type: 'consultation',
      description: `Consultation with patient ${c.patientId}`,
      timestamp: c.createdAt
    }));
  }
}

export const doctorService = new DoctorService();