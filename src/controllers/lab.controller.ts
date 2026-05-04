import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { labRequests } from '../models/lab-requests.model';
import { labResults } from '../models/lab-results.model';
import { testCatalog } from '../models/test-catalog.model';
import { patients } from '../models/patients.model';
import { users } from '../models/users.model';
import { consultations } from '../models/consultations.model';
import { sampleTracking } from '../models/sample-tracking.model';
import { equipmentCalibration } from '../models/equipment-calibration.model';
import { qualityControl } from '../models/quality-control.model';
import { resultTemplates } from '../models/result-templates.model';
import { externalLabConfigs } from '../models/external-lab-configs.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError, validateRequired } from '../utils/errors.util';
import { realTimeNotificationService } from '../services/realtime-notification.service';
import { EmailNotificationService } from '../services/email-notification.service';

class LabValidationError extends Error {
  constructor(message: string, public testName: string, public value: any, public expectedRange: string) {
    super(message);
    this.name = 'LabValidationError';
  }
}

export const createLabRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedBy = req.user!.id;
    const { consultationId, patientId, testName, assignedLabId } = req.body;
    
    validateRequired(req.body, ['patientId', 'testName']);

    const [labRequest] = await db.insert(labRequests).values({
      consultationId,
      patientId,
      testName,
      requestedBy,
      assignedLabId,
      status: 'pending'
    }).returning();

    logger.info(`Lab request created: ${labRequest.id} by ${requestedBy}`);
    successResponse(res, 'Lab request created successfully', { labRequest }, 201);
  } catch (error) {
    logger.error('Create lab request error:', error);
    next(error);
  }
};

export const getLabRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { status, priority, limit = 50, offset = 0 } = req.query;

    const conditions = [eq(labRequests.assignedLabId, facilityId)];
    if (status) conditions.push(eq(labRequests.status, status as string));
    if (priority) conditions.push(eq(labRequests.priority, priority as string));

    const requests = await db.select({
      id: labRequests.id,
      testName: labRequests.testName,
      priority: labRequests.priority,
      status: labRequests.status,
      createdAt: sql<string>`${labRequests.createdAt}::text`,
      sampleCollected: labRequests.sampleCollected,
      sampleType: labRequests.sampleType,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(labRequests)
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(labRequests.createdAt))
    .limit(Number(limit)).offset(Number(offset));

    successResponse(res, 'Lab requests retrieved successfully', { requests });
  } catch (error) {
    logger.error('Get lab requests error:', error);
    next(error);
  }
};

export const getAllLabResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;

    const results = await db.select({
      id: labResults.id,
      testName: labRequests.testName,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      resultText: labResults.resultText,
      validationStatus: labResults.validationStatus,
      isCritical: labResults.isCritical,
      createdAt: sql<string>`${labResults.createdAt}::text`,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(labResults)
    .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .where(eq(labRequests.assignedLabId, facilityId))
    .orderBy(desc(labResults.createdAt))
    .limit(Number(limit)).offset(Number(offset));

    successResponse(res, 'Lab results retrieved successfully', { results });
  } catch (error) {
    logger.error('Get all lab results error:', error);
    next(error);
  }
};

export const uploadLabResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadedBy = req.user!.id;
    const { requestId, resultText, resultFileUrl, resultValue, unit } = req.body;
    
    validateRequired(req.body, ['requestId']);

    // Get test details for validation
    const [request] = await db.select({
      testName: labRequests.testName,
      patientId: labRequests.patientId
    })
    .from(labRequests)
    .where(eq(labRequests.id, requestId))
    .limit(1);

    if (!request) {
      throw new NotFoundError('Lab request');
    }

    // Get test catalog for normal range validation
    const [testInfo] = await db.select()
      .from(testCatalog)
      .where(eq(testCatalog.testName, request.testName))
      .limit(1);

    let isCritical = false;
    let validationStatus = 'normal';
    
    // Validate result against normal ranges
    if (testInfo && testInfo.normalRange && resultValue) {
      const { isValid, status, critical, error } = validateTestResult(resultValue, testInfo.normalRange, request.testName);
      if (error) {
        throw new LabValidationError(
          `Invalid result for ${request.testName}: ${resultValue}. Expected range: ${testInfo.normalRange}`,
          request.testName,
          resultValue,
          testInfo.normalRange
        );
      }
      validationStatus = status;
      isCritical = critical;
    }

    const [result] = await db.insert(labResults).values({
      requestId,
      patientId: request.patientId,
      resultText,
      resultFileUrl,
      uploadedBy,
      resultValue: resultValue?.toString(),
      unit,
      validationStatus,
      isCritical
    }).returning();

    // Update request status
    await db.update(labRequests)
      .set({ status: 'completed' })
      .where(eq(labRequests.id, requestId));

    // Send real-time notifications
    if (isCritical) {
      await sendCriticalResultNotification(request.patientId, request.testName, resultValue, uploadedBy);
      // Send critical result alert to doctors
      await realTimeNotificationService?.sendToRole('doctor', {
        type: 'critical_lab_result',
        title: 'CRITICAL Lab Result',
        message: `Critical ${request.testName} result: ${resultValue}`,
        data: { requestId, testName: request.testName, resultValue, patientId: request.patientId },
        priority: 'urgent'
      });
    }
    
    // Send result completion notification
    await realTimeNotificationService?.sendLabResultUpdate(requestId, {
      status: 'completed',
      testName: request.testName,
      isCritical
    });

    logger.info(`Lab result uploaded: ${result.id} for request ${requestId}${isCritical ? ' [CRITICAL]' : ''}`);
    successResponse(res, 'Lab result uploaded successfully', { result, isCritical }, 201);
  } catch (error) {
    logger.error('Upload lab result error:', error);
    next(error);
  }
};

export const getLabResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const results = await db.select({
      resultId: labResults.id,
      testName: labRequests.testName,
      resultText: labResults.resultText,
      resultFileUrl: labResults.resultFileUrl,
      createdAt: sql<string>`${labResults.createdAt}::text`
    })
    .from(labResults)
    .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
    .where(eq(labRequests.patientId, patientId))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Lab results retrieved successfully', { results });
  } catch (error) {
    logger.error('Get lab results error:', error);
    next(error);
  }
};

export const updateRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updatedRequest] = await db.update(labRequests)
      .set({ status })
      .where(eq(labRequests.id, id))
      .returning();

    if (!updatedRequest) {
      throw new NotFoundError('Lab request');
    }

    // Send real-time status update
    await realTimeNotificationService?.sendLabStatusUpdate(id, {
      status,
      requestId: id,
      testName: updatedRequest.testName,
      patientId: updatedRequest.patientId
    });

    logger.info(`Lab request status updated: ${id} to ${status}`);
    successResponse(res, 'Request status updated successfully', { request: updatedRequest });
  } catch (error) {
    logger.error('Update request status error:', error);
    next(error);
  }
};

export const getTestCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { category, limit = 50, offset = 0 } = req.query;

    let query = db.select().from(testCatalog).where(eq(testCatalog.facilityId, facilityId));
    
    if (category) {
      query = query.where(and(
        eq(testCatalog.facilityId, facilityId),
        eq(testCatalog.category, category as string)
      ));
    }

    const tests = await query.limit(Number(limit)).offset(Number(offset));
    successResponse(res, 'Test catalog retrieved successfully', { tests });
  } catch (error) {
    logger.error('Get test catalog error:', error);
    next(error);
  }
};

export const addTestToCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { testName, category, price, normalRange, unit } = req.body;
    
    validateRequired(req.body, ['testName']);

    const [test] = await db.insert(testCatalog).values({
      testCode: `TEST_${Date.now()}`,
      testName,
      category,
      price,
      normalRange,
      unit
    } as any).returning();

    logger.info(`Test added to catalog: ${test.id}`);
    successResponse(res, 'Test added to catalog successfully', { test }, 201);
  } catch (error) {
    logger.error('Add test to catalog error:', error);
    next(error);
  }
};

export const createBulkLabRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedBy = req.user!.id;
    const facilityId = req.facilityId!;
    const { consultationId, patientId, tests, priority = 'routine' } = req.body;

    const labRequestsData = tests.map((testName: string) => ({
      consultationId,
      patientId,
      testName,
      requestedBy,
      assignedLabId: facilityId,
      priority,
      status: 'pending'
    }));

    const createdRequests = await db.insert(labRequests).values(labRequestsData).returning();

    logger.info(`Bulk lab requests created: ${createdRequests.length} tests for consultation ${consultationId}`);
    successResponse(res, 'Bulk lab requests created successfully', { requests: createdRequests }, 201);
  } catch (error) {
    logger.error('Create bulk lab requests error:', error);
    next(error);
  }
};

export const getCriticalResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 20, offset = 0 } = req.query;

    const criticalResults = await db.select({
      resultId: labResults.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      testName: labRequests.testName,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      createdAt: sql<string>`${labResults.createdAt}::text`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`
    })
    .from(labResults)
    .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(consultations, eq(labRequests.consultationId, consultations.id))
    .leftJoin(users, eq(consultations.doctorId, users.id))
    .where(and(
      eq(labRequests.assignedLabId, facilityId),
      eq(labResults.isCritical, true)
    ))
    .orderBy(desc(labResults.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

    successResponse(res, 'Critical results retrieved', { results: criticalResults });
  } catch (error) {
    logger.error('Get critical results error:', error);
    next(error);
  }
};

export const getLabRequestDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const requestDetails = await db.select({
      requestId: labRequests.id,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      testName: labRequests.testName,
      priority: labRequests.priority,
      status: labRequests.status,
      createdAt: sql<string>`${labRequests.createdAt}::text`,
      resultText: labResults.resultText,
      resultFileUrl: labResults.resultFileUrl,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      validationStatus: labResults.validationStatus,
      isCritical: labResults.isCritical
    })
    .from(labRequests)
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .leftJoin(labResults, eq(labRequests.id, labResults.requestId))
    .where(eq(labRequests.id, id))
    .limit(1);

    if (requestDetails.length === 0) {
      throw new NotFoundError('Lab request');
    }

    successResponse(res, 'Lab request details retrieved', { request: requestDetails[0] });
  } catch (error) {
    logger.error('Get lab request details error:', error);
    next(error);
  }
};

// Helper functions
const validateTestResult = (value: number, normalRange: string, testName: string) => {
  try {
    if (isNaN(value)) {
      return { isValid: false, status: 'error', critical: false, error: `Non-numeric value for ${testName}` };
    }
    
    const ranges = normalRange.split('-').map(r => parseFloat(r.trim()));
    if (ranges.length !== 2 || ranges.some(isNaN)) {
      return { isValid: true, status: 'normal', critical: false, error: null };
    }
    
    const [min, max] = ranges;
    if (min >= max) {
      return { isValid: false, status: 'error', critical: false, error: `Invalid range for ${testName}: ${normalRange}` };
    }
    
    const criticalLow = min * 0.5;
    const criticalHigh = max * 2;
    
    if (value < criticalLow || value > criticalHigh) {
      return { isValid: false, status: 'critical', critical: true, error: null };
    } else if (value < min || value > max) {
      return { isValid: false, status: 'abnormal', critical: false, error: null };
    }
    return { isValid: true, status: 'normal', critical: false, error: null };
  } catch (error) {
    return { isValid: false, status: 'error', critical: false, error: `Validation error for ${testName}: ${error.message}` };
  }
};

const sendCriticalResultNotification = async (patientId: string, testName: string, value: any, uploadedBy: string) => {
  try {
    // Get doctor and patient info
    const [notification] = await db.select({
      doctorEmail: users.email,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`
    })
    .from(consultations)
    .leftJoin(users, eq(consultations.doctorId, users.id))
    .leftJoin(patients, eq(consultations.patientId, patients.id))
    .where(eq(consultations.patientId, patientId))
    .orderBy(desc(consultations.createdAt))
    .limit(1);

    if (notification?.doctorEmail) {
      logger.warn(`CRITICAL RESULT ALERT: ${testName} = ${value} for patient ${notification.patientName}`);
      
      await EmailNotificationService.sendCriticalLabResult({
        doctorEmail: notification.doctorEmail,
        doctorName: notification.doctorName,
        patientName: notification.patientName,
        testName,
        resultValue: value.toString()
      });
    }
  } catch (error) {
    logger.error('Failed to send critical result notification:', error);
  }
};

// Quality Control Methods
export const getSampleTracking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;
    
    const samples = await db.select({
      barcode: sampleTracking.barcode,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      status: sampleTracking.status,
      sampleType: sampleTracking.sampleType,
      currentLocation: sampleTracking.currentLocation,
      collectedAt: sampleTracking.collectedAt
    })
    .from(sampleTracking)
    .leftJoin(patients, eq(sampleTracking.patientId, patients.id))
    .where(eq(sampleTracking.facilityId, facilityId))
    .limit(Number(limit))
    .offset(Number(offset));
    
    successResponse(res, 'Sample tracking data retrieved', { samples });
  } catch (error) {
    logger.error('Get sample tracking error:', error);
    next(error);
  }
};

export const getSampleByBarcode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;
    
    const [sample] = await db.select({
      barcode: sampleTracking.barcode,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      testName: labRequests.testName,
      status: sampleTracking.status,
      sampleType: sampleTracking.sampleType,
      currentLocation: sampleTracking.currentLocation,
      collectedAt: sampleTracking.collectedAt,
      trackingEvents: sampleTracking.trackingEvents,
      notes: sampleTracking.notes
    })
    .from(sampleTracking)
    .leftJoin(patients, eq(sampleTracking.patientId, patients.id))
    .leftJoin(labRequests, eq(sampleTracking.requestId, labRequests.id))
    .where(eq(sampleTracking.barcode, barcode))
    .limit(1);

    if (!sample) {
      throw new NotFoundError('Sample');
    }
    
    successResponse(res, 'Sample details retrieved', { sample });
  } catch (error) {
    logger.error('Get sample by barcode error:', error);
    next(error);
  }
};

export const getEquipmentCalibration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;
    
    const equipment = await db.select({
      id: equipmentCalibration.id,
      name: equipmentCalibration.equipmentName,
      model: equipmentCalibration.model,
      serialNumber: equipmentCalibration.serialNumber,
      lastCalibration: equipmentCalibration.lastCalibrationDate,
      nextCalibration: equipmentCalibration.nextCalibrationDate,
      status: equipmentCalibration.calibrationStatus,
      performedBy: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      notes: equipmentCalibration.notes
    })
    .from(equipmentCalibration)
    .leftJoin(users, eq(equipmentCalibration.performedBy, users.id))
    .where(eq(equipmentCalibration.facilityId, facilityId))
    .limit(Number(limit))
    .offset(Number(offset));
    
    successResponse(res, 'Equipment calibration data retrieved', { equipment });
  } catch (error) {
    logger.error('Get equipment calibration error:', error);
    next(error);
  }
};

export const recordCalibration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { equipmentId, calibrationDate, nextDueDate, notes } = req.body;
    const performedBy = req.user!.id;
    const facilityId = req.facilityId!;
    
    validateRequired(req.body, ['equipmentId', 'calibrationDate', 'nextDueDate']);
    
    const [calibration] = await db.update(equipmentCalibration)
      .set({
        lastCalibrationDate: calibrationDate,
        nextCalibrationDate: nextDueDate,
        calibrationStatus: 'current',
        performedBy,
        notes,
        updatedAt: new Date()
      })
      .where(and(
        eq(equipmentCalibration.id, equipmentId),
        eq(equipmentCalibration.facilityId, facilityId)
      ))
      .returning();

    if (!calibration) {
      throw new NotFoundError('Equipment');
    }
    
    logger.info(`Equipment calibration recorded: ${equipmentId}`);
    successResponse(res, 'Calibration recorded successfully', { calibration }, 201);
  } catch (error) {
    logger.error('Record calibration error:', error);
    next(error);
  }
};

export const submitQAChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkType, checkResults, notes } = req.body;
    const performedBy = req.user!.id;
    const facilityId = req.facilityId!;
    
    validateRequired(req.body, ['checkType', 'checkResults']);
    
    const [checklist] = await db.insert(qualityControl).values({
      checkType,
      performedBy,
      notes,
      status: 'completed'
    } as any).returning();
    
    logger.info(`QA checklist submitted by ${performedBy}`);
    successResponse(res, 'QA checklist submitted successfully', { checklist }, 201);
  } catch (error) {
    logger.error('Submit QA checklist error:', error);
    next(error);
  }
};

// Template Methods
export const getResultTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0 } = req.query;
    
    const templates = await db.select()
      .from(resultTemplates)
      .where(eq(resultTemplates.facilityId, facilityId))
      .limit(Number(limit))
      .offset(Number(offset));
    
    successResponse(res, 'Result templates retrieved', { templates });
  } catch (error) {
    logger.error('Get result templates error:', error);
    next(error);
  }
};

export const saveResultTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, testType, templateFields, description } = req.body;
    const facilityId = req.facilityId!;
    
    validateRequired(req.body, ['name', 'testType']);
    
    const [template] = await db.insert(resultTemplates).values({
      facilityId,
      templateName: name,
      testType,
      fields: templateFields || {},
      createdBy: req.user!.id
    }).returning();
    
    logger.info(`Result template saved: ${template.templateName}`);
    successResponse(res, 'Template saved successfully', { template }, 201);
  } catch (error) {
    logger.error('Save result template error:', error);
    next(error);
  }
};

export const deleteResultTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const facilityId = req.facilityId!;
    
    const [deletedTemplate] = await db.delete(resultTemplates)
      .where(and(
        eq(resultTemplates.id, id),
        eq(resultTemplates.facilityId, facilityId)
      ))
      .returning();

    if (!deletedTemplate) {
      throw new NotFoundError('Template');
    }
    
    logger.info(`Result template deleted: ${id}`);
    successResponse(res, 'Template deleted successfully');
  } catch (error) {
    logger.error('Delete result template error:', error);
    next(error);
  }
};

// External Lab Integration Methods
export const getExternalLabConfigurations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    
    const configurations = await db.select({
      id: externalLabConfigs.id,
      name: externalLabConfigs.labName,
      endpoint: externalLabConfigs.apiEndpoint,
      type: externalLabConfigs.integrationType,
      status: externalLabConfigs.connectionStatus,
      autoSync: externalLabConfigs.autoSync,
      isActive: externalLabConfigs.isActive,
      lastSyncTime: externalLabConfigs.lastSyncTime
    })
    .from(externalLabConfigs)
    .where(eq(externalLabConfigs.facilityId, facilityId));
    
    successResponse(res, 'External lab configurations retrieved', { configurations });
  } catch (error) {
    logger.error('Get external lab configurations error:', error);
    next(error);
  }
};

export const saveExternalLabConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { labName, apiEndpoint, integrationType, credentials, autoSync } = req.body;
    const facilityId = req.facilityId!;
    
    validateRequired(req.body, ['labName', 'apiEndpoint', 'integrationType']);
    
    const [config] = await db.insert(externalLabConfigs).values({
      facilityId,
      labName,
      apiEndpoint,
      integrationType,
      credentials,
      autoSync: autoSync || false,
      connectionStatus: 'disconnected'
    }).returning();
    
    logger.info(`External lab configuration saved: ${config.labName}`);
    successResponse(res, 'Configuration saved successfully', { config }, 201);
  } catch (error) {
    logger.error('Save external lab config error:', error);
    next(error);
  }
};

export const testExternalLabConnection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { labId } = req.params;
    const facilityId = req.facilityId!;
    
    const [labConfig] = await db.select()
      .from(externalLabConfigs)
      .where(and(
        eq(externalLabConfigs.id, labId),
        eq(externalLabConfigs.facilityId, facilityId)
      ))
      .limit(1);

    if (!labConfig) {
      throw new NotFoundError('Lab configuration');
    }

    const startTime = Date.now();
    let connectionStatus = 'disconnected';
    let errorMessage = null;

    try {
      const response = await fetch(labConfig.apiEndpoint + '/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...((labConfig.credentials as any)?.apiKey && { 'Authorization': `Bearer ${(labConfig.credentials as any).apiKey}` })
        },
        signal: AbortSignal.timeout(10000)
      });
      
      connectionStatus = response.ok ? 'connected' : 'error';
      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error: any) {
      connectionStatus = 'error';
      errorMessage = error.message;
    }

    const responseTime = Date.now() - startTime;

    // Update connection status in database
    await db.update(externalLabConfigs)
      .set({ 
        connectionStatus,
        updatedAt: new Date()
      })
      .where(eq(externalLabConfigs.id, labId));

    const connectionResult = {
      labId,
      status: connectionStatus,
      responseTime,
      errorMessage,
      testedAt: new Date()
    };
    
    logger.info(`External lab connection tested: ${labId} - ${connectionStatus}`);
    successResponse(res, 'Connection test completed', { result: connectionResult });
  } catch (error) {
    logger.error('Test external lab connection error:', error);
    next(error);
  }
};

export const sendOrdersToExternalLab = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orders, labId } = req.body;
    const facilityId = req.facilityId!;
    
    validateRequired(req.body, ['orders', 'labId']);
    
    const [labConfig] = await db.select()
      .from(externalLabConfigs)
      .where(and(
        eq(externalLabConfigs.id, labId),
        eq(externalLabConfigs.facilityId, facilityId)
      ))
      .limit(1);

    if (!labConfig) {
      throw new NotFoundError('Lab configuration');
    }

    const results = [];
    
    for (const order of orders) {
      try {
        const orderPayload = {
          orderId: order.id,
          patientId: order.patientId,
          testName: order.testName,
          priority: order.priority || 'routine',
          requestedDate: new Date().toISOString()
        };

        const response = await fetch(labConfig.apiEndpoint + '/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...((labConfig.credentials as any)?.apiKey && { 'Authorization': `Bearer ${(labConfig.credentials as any).apiKey}` })
          },
          body: JSON.stringify(orderPayload),
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          results.push({
            orderId: order.id,
            status: 'success',
            message: 'Order sent successfully'
          });
          
          // Update lab request status
          await db.update(labRequests)
            .set({ status: 'sent_to_external_lab' })
            .where(eq(labRequests.id, order.id));
        } else {
          results.push({
            orderId: order.id,
            status: 'error',
            message: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error: any) {
        results.push({
          orderId: order.id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    logger.info(`Orders sent to external lab ${labConfig.labName}: ${orders.length}`);
    successResponse(res, 'Orders processed', { results });
  } catch (error) {
    logger.error('Send orders to external lab error:', error);
    next(error);
  }
};

export const syncExternalLabResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    
    const labConfigs = await db.select()
      .from(externalLabConfigs)
      .where(and(
        eq(externalLabConfigs.facilityId, facilityId),
        eq(externalLabConfigs.isActive, true),
        eq(externalLabConfigs.connectionStatus, 'connected')
      ));

    let totalSynced = 0;
    let newResults = 0;
    let updatedResults = 0;
    let errors = 0;

    for (const labConfig of labConfigs) {
      try {
        const response = await fetch(labConfig.apiEndpoint + '/results', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...((labConfig.credentials as any)?.apiKey && { 'Authorization': `Bearer ${(labConfig.credentials as any).apiKey}` })
          },
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];

          for (const result of results) {
            try {
              // Check if result already exists
              const [existingResult] = await db.select()
                .from(labResults)
                .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
                .where(eq(labRequests.id, result.orderId))
                .limit(1);

              if (existingResult) {
                // Update existing result
                await db.update(labResults)
                  .set({
                    resultText: result.resultText,
                    resultValue: result.resultValue,
                    unit: result.unit,
                    validationStatus: result.status || 'normal',
                    isCritical: result.isCritical || false
                  })
                  .where(eq(labResults.id, existingResult.lab_results.id));
                updatedResults++;
              } else {
                // Create new result
                // Get patient ID from the request
                const [requestInfo] = await db.select({ patientId: labRequests.patientId })
                  .from(labRequests)
                  .where(eq(labRequests.id, result.orderId))
                  .limit(1);
                
                if (requestInfo) {
                  await db.insert(labResults).values({
                    requestId: result.orderId,
                    patientId: requestInfo.patientId,
                    resultText: result.resultText,
                    resultValue: result.resultValue,
                    unit: result.unit,
                    validationStatus: result.status || 'normal',
                    isCritical: result.isCritical || false,
                    uploadedBy: null // External lab result
                  });
                }
                newResults++;
              }
              totalSynced++;
            } catch (resultError) {
              errors++;
              logger.error(`Error processing result ${result.orderId}:`, resultError);
            }
          }

          // Update last sync time
          await db.update(externalLabConfigs)
            .set({ lastSyncTime: new Date() })
            .where(eq(externalLabConfigs.id, labConfig.id));
        }
      } catch (labError) {
        errors++;
        logger.error(`Error syncing from lab ${labConfig.labName}:`, labError);
      }
    }
    
    const syncResult = {
      totalSynced,
      newResults,
      updatedResults,
      errors,
      lastSyncTime: new Date()
    };
    
    logger.info(`External lab results synced: ${totalSynced} total, ${newResults} new, ${updatedResults} updated, ${errors} errors`);
    successResponse(res, 'Results synced successfully', { syncResult });
  } catch (error) {
    logger.error('Sync external lab results error:', error);
    next(error);
  }
};

export const getExternalLabStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get counts from database
    const [sentCount] = await db.select({ count: sql<number>`count(*)` })
      .from(labRequests)
      .where(and(
        eq(labRequests.assignedLabId, facilityId),
        eq(labRequests.status, 'sent_to_external_lab'),
        sql`${labRequests.createdAt} >= ${today}`
      ));

    const [receivedCount] = await db.select({ count: sql<number>`count(*)` })
      .from(labResults)
      .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
      .where(and(
        eq(labRequests.assignedLabId, facilityId),
        sql`${labResults.uploadedBy} IS NULL`, // External lab results
        sql`${labResults.createdAt} >= ${today}`
      ));

    const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
      .from(labRequests)
      .where(and(
        eq(labRequests.assignedLabId, facilityId),
        eq(labRequests.status, 'pending')
      ));

    // Get last sync time from most recent external lab config
    const [lastSync] = await db.select({ lastSyncTime: externalLabConfigs.lastSyncTime })
      .from(externalLabConfigs)
      .where(eq(externalLabConfigs.facilityId, facilityId))
      .orderBy(desc(externalLabConfigs.lastSyncTime))
      .limit(1);
    
    const status = {
      totalSent: sentCount?.count || 0,
      totalReceived: receivedCount?.count || 0,
      pendingOrders: pendingCount?.count || 0,
      failedTransmissions: 0, // Could be tracked in a separate error log table
      lastSyncTime: lastSync?.lastSyncTime || null
    };
    
    successResponse(res, 'External lab status retrieved', { status });
  } catch (error) {
    logger.error('Get external lab status error:', error);
    next(error);
  }
};

export const getWorklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const requests = await db.select({
      id: labRequests.id,
      testName: labRequests.testName,
      priority: labRequests.priority,
      status: labRequests.status,
      createdAt: sql<string>`${labRequests.createdAt}::text`,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientCode: patients.patientCode,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      category: testCatalog.category,
      sampleCollected: labRequests.sampleCollected,
      sampleCollectedAt: sql<string>`${labRequests.sampleCollectedAt}::text`,
    })
    .from(labRequests)
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .leftJoin(testCatalog, eq(labRequests.testName, testCatalog.testName))
    .where(and(
      eq(labRequests.assignedLabId, facilityId),
      sql`${labRequests.status} != 'completed'`
    ))
    .orderBy(
      sql`CASE ${labRequests.priority} WHEN 'stat' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END`,
      labRequests.createdAt
    );

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const r of requests) {
      const cat = r.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }

    successResponse(res, 'Worklist retrieved', { worklist: grouped, total: requests.length });
  } catch (error) {
    logger.error('Get worklist error:', error);
    next(error);
  }
};

export const collectSample = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { sampleType, notes } = req.body;
    const collectedBy = req.user!.id;

    const [updated] = await db.update(labRequests)
      .set({
        sampleCollected: true,
        sampleCollectedAt: new Date(),
        sampleType: sampleType || 'blood',
        sampleNotes: notes,
        status: 'in-progress',
      })
      .where(eq(labRequests.id, id))
      .returning();

    if (!updated) throw new NotFoundError('Lab request');

    logger.info(`Sample collected for request ${id} by ${collectedBy}`);
    successResponse(res, 'Sample collected successfully', { request: updated });
  } catch (error) {
    logger.error('Collect sample error:', error);
    next(error);
  }
};

export const getPatientLabHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const [patientInfo] = await db.select({
      id: patients.id,
      name: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      patientCode: patients.patientCode,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

    const history = await db.select({
      requestId: labRequests.id,
      testName: labRequests.testName,
      priority: labRequests.priority,
      requestStatus: labRequests.status,
      requestedAt: sql<string>`${labRequests.createdAt}::text`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      resultId: labResults.id,
      resultValue: labResults.resultValue,
      unit: labResults.unit,
      resultText: labResults.resultText,
      validationStatus: labResults.validationStatus,
      isCritical: labResults.isCritical,
      resultedAt: sql<string>`${labResults.createdAt}::text`,
    })
    .from(labRequests)
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .leftJoin(labResults, eq(labRequests.id, labResults.requestId))
    .where(eq(labRequests.patientId, patientId))
    .orderBy(desc(labRequests.createdAt));

    successResponse(res, 'Patient lab history retrieved', { patient: patientInfo, history });
  } catch (error) {
    logger.error('Get patient lab history error:', error);
    next(error);
  }
};

export const getDailyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [totalToday] = await db.select({ count: sql<number>`count(*)` })
      .from(labRequests)
      .where(and(eq(labRequests.assignedLabId, facilityId), sql`${labRequests.createdAt} >= ${today}`));

    const [completedToday] = await db.select({ count: sql<number>`count(*)` })
      .from(labResults)
      .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
      .where(and(eq(labRequests.assignedLabId, facilityId), sql`${labResults.createdAt} >= ${today}`));

    const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
      .from(labRequests)
      .where(and(eq(labRequests.assignedLabId, facilityId), eq(labRequests.status, 'pending')));

    const [inProgressCount] = await db.select({ count: sql<number>`count(*)` })
      .from(labRequests)
      .where(and(eq(labRequests.assignedLabId, facilityId), eq(labRequests.status, 'in-progress')));

    const [criticalToday] = await db.select({ count: sql<number>`count(*)` })
      .from(labResults)
      .leftJoin(labRequests, eq(labResults.requestId, labRequests.id))
      .where(and(
        eq(labRequests.assignedLabId, facilityId),
        eq(labResults.isCritical, true),
        sql`${labResults.createdAt} >= ${today}`
      ));

    const inProgressTests = await db.select({
      id: labRequests.id,
      testName: labRequests.testName,
      priority: labRequests.priority,
      createdAt: sql<string>`${labRequests.createdAt}::text`,
      sampleCollectedAt: sql<string>`${labRequests.sampleCollectedAt}::text`,
      sampleType: labRequests.sampleType,
      patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
      doctorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(labRequests)
    .leftJoin(patients, eq(labRequests.patientId, patients.id))
    .leftJoin(users, eq(labRequests.requestedBy, users.id))
    .where(and(eq(labRequests.assignedLabId, facilityId), eq(labRequests.status, 'in-progress')))
    .orderBy(labRequests.createdAt)
    .limit(10);

    const byCategory = await db.select({
      category: sql<string>`COALESCE(${testCatalog.category}, 'General')`,
      count: sql<number>`count(*)`,
    })
    .from(labRequests)
    .leftJoin(testCatalog, eq(labRequests.testName, testCatalog.testName))
    .where(and(eq(labRequests.assignedLabId, facilityId), sql`${labRequests.createdAt} >= ${today}`))
    .groupBy(sql`COALESCE(${testCatalog.category}, 'General')`);

    successResponse(res, 'Daily stats retrieved', {
      stats: {
        totalToday: Number(totalToday?.count || 0),
        completedToday: Number(completedToday?.count || 0),
        pendingCount: Number(pendingCount?.count || 0),
        inProgressCount: Number(inProgressCount?.count || 0),
        criticalToday: Number(criticalToday?.count || 0),
      },
      inProgressTests,
      byCategory,
    });
  } catch (error) {
    logger.error('Get daily stats error:', error);
    next(error);
  }
};
