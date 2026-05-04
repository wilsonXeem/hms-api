import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { dispensations } from '../models/dispensations.model';
import { prescriptions } from '../models/prescriptions.model';
import { prescriptionItems } from '../models/prescription-items.model';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { patients } from '../models/patients.model';
import { users } from '../models/users.model';
import { consultations } from '../models/consultations.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { NotFoundError, BusinessLogicError, SafetyError, validateRequired, ValidationError } from '../utils/errors.util';

class PharmacySafetyError extends Error {
  constructor(message: string, public code: string, public severity: 'warning' | 'critical' = 'warning') {
    super(message);
    this.name = 'PharmacySafetyError';
  }
}

class InventoryConstraintError extends Error {
  constructor(message: string, public itemName: string, public available: number, public required: number) {
    super(message);
    this.name = 'InventoryConstraintError';
  }
}

export const getPendingPrescriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;

    const pendingPrescriptions = await db.select({
      prescriptionId: prescriptions.id,
      consultationId: prescriptions.consultationId,
      prescribedBy: prescriptions.prescribedBy,
      remarks: prescriptions.remarks,
      createdAt: prescriptions.createdAt,
      itemId: prescriptionItems.id,
      drugName: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantityPrescribed: prescriptionItems.quantityPrescribed
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Pending prescriptions retrieved', { prescriptions: pendingPrescriptions });
  } catch (error) {
    logger.error('Get pending prescriptions error:', error);
    next(error);
  }
};

export const verifyPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prescriptionId } = req.params;
    
    const prescriptionData = await db.select({
      prescriptionId: prescriptions.id,
      patientId: consultations.patientId,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientDOB: patients.dob,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      consultationDate: consultations.createdAt,
      drugName: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      itemId: prescriptionItems.id
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.prescribedBy, users.id))
    .where(eq(prescriptions.id, prescriptionId));

    if (prescriptionData.length === 0) {
      throw new NotFoundError('Prescription');
    }

    // Check for drug interactions
    const drugNames = prescriptionData.map(item => item.drugName).filter(Boolean);
    const interactions = await checkDrugInteractionsInternal(drugNames);
    
    // Check patient allergies (simplified - would normally check patient allergy records)
    const allergies = await checkPatientAllergies(prescriptionData[0].patientId, drugNames);
    
    const verificationResult = {
      prescription: prescriptionData,
      interactions,
      allergies,
      isValid: interactions.length === 0 && allergies.length === 0,
      warnings: [...interactions, ...allergies]
    };

    successResponse(res, 'Prescription verified', verificationResult);
  } catch (error) {
    logger.error('Verify prescription error:', error);
    next(error);
  }
};

export const dispenseMedication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacistId = req.user!.id;
    const { prescriptionItemId, quantityDispensed, remarks, patientCounseled = false } = req.body;

    // Get prescription item details
    const [prescriptionItem] = await db.select({
      drugName: prescriptionItems.drugName,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      patientId: sql<string>`${consultations.patientId}`
    })
    .from(prescriptionItems)
    .leftJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .where(eq(prescriptionItems.id, prescriptionItemId))
    .limit(1);

    validateRequired(req.body, ['prescriptionItemId', 'quantityDispensed']);
    
    if (!prescriptionItem) {
      throw new NotFoundError('Prescription item');
    }
    
    // Validate quantity
    if (quantityDispensed <= 0) {
      throw new Error('Quantity dispensed must be greater than 0');
    }
    
    if (quantityDispensed > Number(prescriptionItem.quantityPrescribed)) {
      throw new Error('Cannot dispense more than prescribed quantity');
    }

    // Find best batch using FIFO
    const availableBatch = await findBestBatchForDispensing(prescriptionItem.drugName, quantityDispensed);
    
    if (!availableBatch) {
      const available = await getAvailableStock(prescriptionItem.drugName);
      throw new InventoryConstraintError(
        `Insufficient stock: ${prescriptionItem.drugName}. Available: ${available}, Required: ${quantityDispensed}`,
        prescriptionItem.drugName,
        available,
        quantityDispensed
      );
    }

    // Check for drug interactions and allergies
    const safetyCheck = await performSafetyChecks(prescriptionItem.patientId, [prescriptionItem.drugName]);
    
    if (safetyCheck.hasWarnings && !req.body.overrideSafety) {
      const criticalWarnings = safetyCheck.warnings.filter(w => w.severity === 'major');
      if (criticalWarnings.length > 0) {
        throw new PharmacySafetyError(
          `Critical safety warnings: ${criticalWarnings.map(w => w.warning).join('; ')}`,
          'CRITICAL_SAFETY_WARNING',
          'critical'
        );
      }
      throw new PharmacySafetyError(
        `Safety warnings detected: ${safetyCheck.warnings.map(w => w.warning).join('; ')}`,
        'SAFETY_WARNING',
        'warning'
      );
    }

    // Create dispensation record
    const [dispensation] = await db.insert(dispensations).values({
      prescriptionItemId,
      pharmacistId,
      batchId: availableBatch.id,
      quantityDispensed,
      remarks,
      patientCounseled
    }).returning();

    // Update batch quantity
    await db.update(inventoryBatches)
      .set({ quantity: sql`${inventoryBatches.quantity} - ${quantityDispensed}` })
      .where(eq(inventoryBatches.id, availableBatch.id));

    // Check if prescription is fully dispensed
    const totalDispensed = await getTotalDispensedQuantity(prescriptionItemId);
    const isComplete = Number(totalDispensed) >= Number(prescriptionItem.quantityPrescribed);

    if (isComplete) {
      await markPrescriptionItemComplete(prescriptionItemId);
    }

    logger.info(`Medication dispensed: ${dispensation.id} by pharmacist ${pharmacistId}`);
    successResponse(res, 'Medication dispensed successfully', { 
      dispensation, 
      isComplete,
      warnings: safetyCheck.warnings 
    }, 201);
  } catch (error) {
    logger.error('Dispense medication error:', error);
    next(error);
  }
};

export const getDispensationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacistId = req.user!.id;
    const { limit = 50, offset = 0 } = req.query;

    const history = await db.select().from(dispensations)
      .where(eq(dispensations.pharmacistId, pharmacistId))
      .limit(Number(limit))
      .offset(Number(offset));

    successResponse(res, 'Dispensation history retrieved', { dispensations: history });
  } catch (error) {
    logger.error('Get dispensation history error:', error);
    next(error);
  }
};

export const checkDrugAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { drugName } = req.params;

    const availability = await db.select({
      itemId: inventoryItems.id,
      itemName: inventoryItems.name,
      batchId: inventoryBatches.id,
      batchNumber: inventoryBatches.batchNumber,
      quantity: inventoryBatches.quantity,
      expiryDate: inventoryBatches.expiryDate,
      sellingPrice: inventoryBatches.sellingPrice
    })
    .from(inventoryItems)
    .leftJoin(inventoryBatches, eq(inventoryItems.id, inventoryBatches.itemId))
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`LOWER(${inventoryItems.name}) LIKE LOWER(${'%' + drugName + '%'})`
    ));

    successResponse(res, 'Drug availability checked', { availability });
  } catch (error) {
    logger.error('Check drug availability error:', error);
    next(error);
  }
};

export const getExpiringDrugs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { days = 30 } = req.query;

    const expiringDrugs = await db.select({
      itemName: inventoryItems.name,
      batchNumber: inventoryBatches.batchNumber,
      quantity: inventoryBatches.quantity,
      expiryDate: inventoryBatches.expiryDate
    })
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '${days} days'`
    ));

    successResponse(res, 'Expiring drugs retrieved', { expiringDrugs });
  } catch (error) {
    logger.error('Get expiring drugs error:', error);
    next(error);
  }
};

export const validatePrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prescriptionId } = req.params;

    const prescriptionDetails = await db.select({
      prescriptionId: prescriptions.id,
      consultationId: prescriptions.consultationId,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      drugName: prescriptionItems.drugName,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      isDispensed: sql<boolean>`CASE WHEN ${dispensations.id} IS NOT NULL THEN true ELSE false END`
    })
    .from(prescriptions)
    .leftJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.prescribedBy, users.id))
    .leftJoin(dispensations, eq(prescriptionItems.id, dispensations.prescriptionItemId))
    .where(eq(prescriptions.id, prescriptionId));

    if (prescriptionDetails.length === 0) {
      throw new NotFoundError('Prescription');
    }

    successResponse(res, 'Prescription validated', { prescription: prescriptionDetails });
  } catch (error) {
    logger.error('Validate prescription error:', error);
    next(error);
  }
};

export const getDispensationsByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const dispensationHistory = await db.select({
      dispensationId: dispensations.id,
      drugName: prescriptionItems.drugName,
      quantityDispensed: dispensations.quantityDispensed,
      batchNumber: inventoryBatches.batchNumber,
      pharmacistName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      dispensedAt: dispensations.createdAt,
      remarks: dispensations.remarks
    })
    .from(dispensations)
    .leftJoin(prescriptionItems, eq(dispensations.prescriptionItemId, prescriptionItems.id))
    .leftJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .leftJoin(inventoryBatches, eq(dispensations.batchId, inventoryBatches.id))
    .leftJoin(users, eq(dispensations.pharmacistId, users.id))
    .where(eq(consultations.patientId, patientId))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Patient dispensation history retrieved', { dispensations: dispensationHistory });
  } catch (error) {
    logger.error('Get dispensations by patient error:', error);
    next(error);
  }
};

export const checkDrugInteractions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { drugNames } = req.body;
    const interactions = await checkDrugInteractionsInternal(drugNames);
    successResponse(res, 'Drug interactions checked', { interactions });
  } catch (error) {
    logger.error('Check drug interactions error:', error);
    next(error);
  }
};

export const getPartialDispensations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;

    const partialDispensations = await db.select({
      prescriptionId: prescriptions.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      drugName: prescriptionItems.drugName,
      quantityPrescribed: prescriptionItems.quantityPrescribed,
      totalDispensed: sql<number>`COALESCE(SUM(${dispensations.quantityDispensed}), 0)`,
      remainingQuantity: sql<number>`${prescriptionItems.quantityPrescribed} - COALESCE(SUM(${dispensations.quantityDispensed}), 0)`
    })
    .from(prescriptionItems)
    .leftJoin(prescriptions, eq(prescriptionItems.prescriptionId, prescriptions.id))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(dispensations, eq(prescriptionItems.id, dispensations.prescriptionItemId))
    .groupBy(prescriptions.id, patients.firstName, patients.lastName, prescriptionItems.drugName, prescriptionItems.quantityPrescribed)
    .having(sql`${prescriptionItems.quantityPrescribed} > COALESCE(SUM(${dispensations.quantityDispensed}), 0)`)
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Partial dispensations retrieved', { dispensations: partialDispensations });
  } catch (error) {
    logger.error('Get partial dispensations error:', error);
    next(error);
  }
};

// Helper functions
const checkDrugInteractionsInternal = async (drugNames: string[]) => {
  const interactions = [];
  const knownInteractions = {
    'warfarin': { conflicts: ['aspirin', 'ibuprofen', 'clopidogrel'], severity: 'major' },
    'metformin': { conflicts: ['alcohol'], severity: 'moderate' },
    'digoxin': { conflicts: ['furosemide', 'amiodarone'], severity: 'major' },
    'simvastatin': { conflicts: ['amlodipine', 'diltiazem'], severity: 'moderate' },
    'phenytoin': { conflicts: ['warfarin', 'carbamazepine'], severity: 'major' }
  };

  for (const drug of drugNames) {
    const drugLower = drug.toLowerCase();
    if (knownInteractions[drugLower]) {
      const { conflicts, severity } = knownInteractions[drugLower];
      const conflictingDrugs = conflicts.filter(conflict => 
        drugNames.some(d => d.toLowerCase().includes(conflict))
      );
      if (conflictingDrugs.length > 0) {
        interactions.push({
          type: 'drug_interaction',
          drug,
          conflicts: conflictingDrugs,
          severity,
          warning: `${drug} has ${severity} interaction with ${conflictingDrugs.join(', ')}`
        });
      }
    }
  }
  return interactions;
};

const checkPatientAllergies = async (patientId: string, drugNames: string[]) => {
  // Simplified allergy check - in real implementation, would check patient allergy records
  const commonAllergies = ['penicillin', 'sulfa', 'aspirin'];
  const allergies = [];
  
  for (const drug of drugNames) {
    const drugLower = drug.toLowerCase();
    for (const allergy of commonAllergies) {
      if (drugLower.includes(allergy)) {
        allergies.push({
          type: 'allergy_warning',
          drug,
          allergen: allergy,
          severity: 'major',
          warning: `Patient may be allergic to ${allergy} in ${drug}`
        });
      }
    }
  }
  return allergies;
};

const findBestBatchForDispensing = async (drugName: string, quantityNeeded: number) => {
  const [batch] = await db.select()
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
    .where(and(
      sql`LOWER(${inventoryItems.name}) LIKE LOWER(${'%' + drugName + '%'})`,
      sql`${inventoryBatches.quantity} >= ${quantityNeeded}`,
      sql`${inventoryBatches.expiryDate} > CURRENT_DATE`
    ))
    .orderBy(inventoryBatches.expiryDate) // FIFO
    .limit(1);
  
  return batch ? batch.inventory_batches : null;
};

const performSafetyChecks = async (patientId: string, drugNames: string[]) => {
  const interactions = await checkDrugInteractionsInternal(drugNames);
  const allergies = await checkPatientAllergies(patientId, drugNames);
  
  return {
    hasWarnings: interactions.length > 0 || allergies.length > 0,
    warnings: [...interactions, ...allergies]
  };
};

const getTotalDispensedQuantity = async (prescriptionItemId: string) => {
  const [result] = await db.select({
    total: sql<number>`COALESCE(SUM(${dispensations.quantityDispensed}), 0)`
  })
  .from(dispensations)
  .where(eq(dispensations.prescriptionItemId, prescriptionItemId));
  
  return result?.total || 0;
};

const markPrescriptionItemComplete = async (prescriptionItemId: string) => {
  // This would update a status field if it existed in the model
  logger.info(`Prescription item ${prescriptionItemId} fully dispensed`);
};

const getAvailableStock = async (drugName: string): Promise<number> => {
  const [result] = await db.select({
    total: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)`
  })
  .from(inventoryBatches)
  .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
  .where(and(
    sql`LOWER(${inventoryItems.name}) LIKE LOWER(${'%' + drugName + '%'})`,
    sql`${inventoryBatches.expiryDate} > CURRENT_DATE`
  ));
  
  return result?.total || 0;
};


export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prescriptions)
      .where(eq(prescriptions.status, 'pending'));

    const [dispensedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dispensations)
      .where(sql`${dispensations.createdAt} >= ${today}`);

    const [lowStockCount] = await db
      .select({ count: sql<number>`count(DISTINCT ${inventoryItems.id})` })
      .from(inventoryBatches)
      .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .where(and(
        eq(inventoryItems.facilityId, facilityId),
        sql`${inventoryBatches.quantity} < 10`
      ));

    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);
    const [expiringCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryBatches)
      .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .where(and(
        eq(inventoryItems.facilityId, facilityId),
        sql`${inventoryBatches.expiryDate} <= ${expiringDate}`,
        sql`${inventoryBatches.expiryDate} > CURRENT_DATE`
      ));

    const recentPrescriptions = await db.select({
      id: prescriptions.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      createdAt: prescriptions.createdAt,
      status: prescriptions.status,
    })
    .from(prescriptions)
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .leftJoin(users, eq(prescriptions.prescribedBy, users.id))
    .where(eq(prescriptions.status, 'pending'))
    .orderBy(desc(prescriptions.createdAt))
    .limit(8);

    successResponse(res, 'Dashboard stats retrieved', {
      stats: {
        pendingPrescriptions: Number(pendingCount?.count || 0),
        dispensedToday: Number(dispensedToday?.count || 0),
        lowStockItems: Number(lowStockCount?.count || 0),
        expiringItems: Number(expiringCount?.count || 0),
      },
      recentPrescriptions,
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};
