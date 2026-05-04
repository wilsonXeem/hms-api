import { db } from '../config/db.config';
import { labRequests, labResults, testCatalog, sampleTracking, equipmentCalibration, resultTemplates, externalLabConfigs } from '../drizzle/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

export class LabService {
  async createLabRequest(data: any) {
    return await db.insert(labRequests).values(data).returning();
  }

  async createBulkLabRequests(requests: any[]) {
    return await db.insert(labRequests).values(requests).returning();
  }

  async getLabRequests(filters: any) {
    const conditions = [];
    if (filters.status) conditions.push(eq(labRequests.status, filters.status));
    if (filters.priority) conditions.push(eq(labRequests.priority, filters.priority));
    
    return await db.select().from(labRequests).where(and(...conditions));
  }

  async getLabRequestDetails(id: string) {
    return await db.select().from(labRequests).where(eq(labRequests.id, id)).limit(1);
  }

  async updateRequestStatus(id: string, status: string) {
    return await db.update(labRequests)
      .set({ status })
      .where(eq(labRequests.id, id))
      .returning();
  }

  async uploadLabResult(data: any) {
    return await db.insert(labResults).values(data).returning();
  }

  async getLabResults(requestId: string, filters: any) {
    const conditions = [eq(labResults.requestId, requestId)];
    if (filters.fromDate) conditions.push(eq(labResults.createdAt, filters.fromDate));
    
    return await db.select().from(labResults).where(and(...conditions));
  }

  async getCriticalResults() {
    return await db.select().from(labResults).where(eq(labResults.isCritical, true));
  }

  async getTestCatalog() {
    return await db.select().from(testCatalog);
  }

  async addTestToCatalog(data: any) {
    return await db.insert(testCatalog).values(data).returning();
  }
}

export const labService = new LabService();