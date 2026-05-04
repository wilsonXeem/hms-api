import { db } from '../config/database';
import { patients, appointments, inventoryItems, labResults, payments } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

export class ReportService {
  async getDashboardStats() {
    const [patientCount] = await db.select({ count: sql<number>`count(*)` }).from(patients);
    const [appointmentCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments);
    const [revenue] = await db.select({ total: sql<number>`sum(${payments.amount})` }).from(payments);
    
    return {
      patients: patientCount.count,
      appointments: appointmentCount.count,
      revenue: revenue.total || 0
    };
  }

  async getPatientReport(filters: any) {
    return await db.select().from(patients);
  }

  async getConsultationReport(filters: any) {
    return await db.select().from(appointments);
  }

  async getInventoryReport(filters: any) {
    return await db.select().from(inventoryItems);
  }

  async getLabReport(filters: any) {
    return await db.select().from(labResults);
  }

  async getPharmacyReport(filters: any) {
    return await db.select().from(inventoryItems);
  }

  async getRevenueReport(filters: any) {
    return await db.select().from(payments);
  }

  async getDetailedReport(type: string, filters: any) {
    switch (type) {
      case 'patients':
        return this.getPatientReport(filters);
      case 'revenue':
        return this.getRevenueReport(filters);
      default:
        return [];
    }
  }

  async getFinancialReport(filters: any) {
    return await db.select().from(payments);
  }

  async getOperationalReport(filters: any) {
    return {
      appointments: await this.getConsultationReport(filters),
      inventory: await this.getInventoryReport(filters)
    };
  }

  async getAnalyticsReport(filters: any) {
    return await this.getDashboardStats();
  }

  async exportReport(type: string, format: string, filters: any) {
    const data = await this.getDetailedReport(type, filters);
    return { data, format };
  }

  async getReportSchedule() {
    return [];
  }
}

export const reportService = new ReportService();
