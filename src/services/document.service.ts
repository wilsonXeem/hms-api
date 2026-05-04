import { db } from '../config/database';
import { documents } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class DocumentService {
  async uploadDocument(data: any) {
    return await db.insert(documents).values(data).returning();
  }

  async getDocuments(filters: any) {
    const conditions = [];
    if (filters.patientId) conditions.push(eq(documents.relatedId, filters.patientId));
    if (filters.documentType) conditions.push(eq(documents.relatedTo, filters.documentType));
    
    return await db.select().from(documents).where(and(...conditions));
  }

  async getDocumentById(id: string) {
    return await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  }

  async deleteDocument(id: string) {
    return await db.delete(documents).where(eq(documents.id, id)).returning();
  }
}

export const documentService = new DocumentService();
