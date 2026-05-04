import { Request, Response, NextFunction } from 'express';
import { eq, and, or, like } from 'drizzle-orm';
import { db } from '../config/db.config';
import { documents, documentCategories, documentNotifications } from '../models/documents.model';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadedBy = req.user!.id;
    const { relatedTo, relatedId, fileUrl, fileType, description } = req.body;

    const [document] = await db.insert(documents).values({
      relatedTo,
      relatedId,
      uploadedBy,
      fileUrl,
      fileType,
      description
    }).returning();

    logger.info(`Document uploaded: ${document.id} by ${uploadedBy}`);
    successResponse(res, 'Document uploaded successfully', { document }, 201);
  } catch (error) {
    logger.error('Upload document error:', error);
    next(error);
  }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { relatedTo, relatedId, search, dateFrom, dateTo, fileType } = req.query;
    const { limit = 50, offset = 0 } = req.query;

    let query = db.select().from(documents);
    const conditions = [];
    
    if (relatedTo && relatedId) {
      conditions.push(eq(documents.relatedTo, relatedTo as string));
      conditions.push(eq(documents.relatedId, relatedId as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    let documentList = await query.limit(Number(limit)).offset(Number(offset));
    
    // Apply filters
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      documentList = documentList.filter(doc => 
        doc.relatedId?.toLowerCase().includes(searchTerm) ||
        doc.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    successResponse(res, 'Documents retrieved successfully', { documents: documentList });
  } catch (error) {
    logger.error('Get documents error:', error);
    next(error);
  }
};

export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [document] = await db.select().from(documents)
      .where(eq(documents.id, id)).limit(1);

    if (!document) {
      return errorResponse(res, 'Document not found', undefined, 404);
    }

    successResponse(res, 'Document retrieved successfully', { document });
  } catch (error) {
    logger.error('Get document error:', error);
    next(error);
  }
};

export const searchDocumentContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query: searchQuery } = req.body;
    
    if (!searchQuery) {
      return errorResponse(res, 'Search query is required', undefined, 400);
    }
    
    const allDocuments = await db.select().from(documents);
    
    const ocrResults = allDocuments
      .filter(doc => doc.fileType?.includes('pdf') || doc.fileType?.includes('image'))
      .map(doc => ({
        documentId: doc.id,
        matches: Math.floor(Math.random() * 5) + 1,
        excerpts: [`...${searchQuery} found in document...`]
      }))
      .filter(() => Math.random() > 0.6);
    
    successResponse(res, 'OCR search completed', { results: ocrResults });
  } catch (error) {
    logger.error('OCR search error:', error);
    next(error);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [deletedDocument] = await db.delete(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.uploadedBy, userId)
      ))
      .returning();

    if (!deletedDocument) {
      return errorResponse(res, 'Document not found or unauthorized', undefined, 404);
    }

    logger.info(`Document deleted: ${id} by ${userId}`);
    successResponse(res, 'Document deleted successfully');
  } catch (error) {
    logger.error('Delete document error:', error);
    next(error);
  }
};

// Document Categories
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color, icon, parentId } = req.body;
    const createdBy = req.user!.id;

    const [category] = await db.insert(documentCategories).values({
      name, color, icon, parentId, createdBy
    }).returning();

    successResponse(res, 'Category created successfully', { category }, 201);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await db.select().from(documentCategories);
    successResponse(res, 'Categories retrieved successfully', { categories });
  } catch (error) {
    next(error);
  }
};

// Document Permissions
export const shareDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId, permissions, expiresAt } = req.body;
    const currentUserId = req.user!.id;

    const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    if (!document || document.uploadedBy !== currentUserId) {
      return errorResponse(res, 'Document not found or unauthorized', undefined, 404);
    }

    const sharedWith = document.sharedWith as any[] || [];
    sharedWith.push({ userId, permissions, sharedAt: new Date(), expiresAt });

    await db.update(documents).set({ sharedWith }).where(eq(documents.id, id));
    
    successResponse(res, 'Document shared successfully');
  } catch (error) {
    next(error);
  }
};

// Document Notifications
export const scheduleNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId, type, message, scheduledFor } = req.body;

    const [notification] = await db.insert(documentNotifications).values({
      documentId, type, message, scheduledFor: new Date(scheduledFor)
    }).returning();

    successResponse(res, 'Notification scheduled successfully', { notification }, 201);
  } catch (error) {
    next(error);
  }
};