import { Request, Response } from 'express';
import { db } from '../config/database';
import { facilities } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/response.util';
import { 
  hospitalInfoSchema, 
  aboutContentSchema, 
  servicesSchema, 
  logoUploadSchema, 
  socialMediaSchema,
  contactDetailsSchema 
} from '../schemas/validation.schemas';

export const updateHospitalInfo = async (req: Request, res: Response) => {
  try {
    const validatedData = hospitalInfoSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Hospital information updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update hospital information', undefined, 500);
  }
};

export const updateAboutContent = async (req: Request, res: Response) => {
  try {
    const validatedData = aboutContentSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'About content updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update about content', undefined, 500);
  }
};

export const updateServices = async (req: Request, res: Response) => {
  try {
    const validatedData = servicesSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Services updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update services', undefined, 500);
  }
};

export const updateLogo = async (req: Request, res: Response) => {
  try {
    const validatedData = logoUploadSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Logo updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update logo', undefined, 500);
  }
};

export const updateSocialMedia = async (req: Request, res: Response) => {
  try {
    const validatedData = socialMediaSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Social media links updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update social media links', undefined, 500);
  }
};

export const updateContactDetails = async (req: Request, res: Response) => {
  try {
    const validatedData = contactDetailsSchema.parse(req.body);
    const facilityId = req.facilityId;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    const [updatedFacility] = await db.update(facilities)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Contact details updated successfully', updatedFacility);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse(res, error.errors[0].message, undefined, 400);
    }
    return errorResponse(res, 'Failed to update contact details', undefined, 500);
  }
};

export const uploadLogo = async (req: Request, res: Response) => {
  try {
    const facilityId = req.facilityId;
    const file = req.file;

    if (!facilityId) {
      return errorResponse(res, 'Facility not found', undefined, 404);
    }

    if (!file) {
      return errorResponse(res, 'No file uploaded', undefined, 400);
    }

    const logoUrl = file.path || `/uploads/${file.filename}`;

    const [updatedFacility] = await db.update(facilities)
      .set({
        logoUrl,
        updatedAt: new Date()
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    return successResponse(res, 'Logo uploaded successfully', { logoUrl });
  } catch (error) {
    return errorResponse(res, 'Failed to upload logo', undefined, 500);
  }
};