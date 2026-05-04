import { Request, Response, NextFunction } from 'express';
import { AdmissionService } from '../services/admission.service';
import { successResponse } from '../utils/response.util';
import { validateRequired } from '../utils/errors.util';
import { withTransaction } from '../middleware/transaction.middleware';

export const createAdmission = withTransaction(async (req: Request, res: Response, tx: any) => {
  const facilityId = req.facilityId!;
  const userId = req.user?.id!;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const { patientId, admissionType, bedId, wardId, admittingDoctorId, admissionReason } = req.body;

  validateRequired(req.body, ['patientId', 'admissionType', 'admittingDoctorId']);

  const admission = await AdmissionService.createAdmission(
    facilityId,
    { patientId, admissionType, bedId, wardId, admittingDoctorId, admissionReason },
    userId,
    ipAddress
  );

  successResponse(res, 'Admission created successfully', { admission }, 201);
});

export const getAdmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { limit = 50, offset = 0, patientId, status } = req.query;

    const validLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const validOffset = Math.max(Number(offset) || 0, 0);

    const admissions = await AdmissionService.getActiveAdmissions(facilityId, validLimit, validOffset, patientId as string, status as string);
    successResponse(res, 'Admissions retrieved successfully', { admissions });
  } catch (error) {
    next(error);
  }
};

export const getAdmissionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;

    const admission = await AdmissionService.getAdmissionDetails(id, facilityId);
    successResponse(res, 'Admission retrieved successfully', { admission });
  } catch (error) {
    next(error);
  }
};

export const dischargePatient = withTransaction(async (req: Request, res: Response, tx: any) => {
  const facilityId = req.facilityId!;
  const userId = req.user?.id!;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const { id } = req.params;
  const { dischargingDoctorId, dischargeReason, dischargeSummary } = req.body;

  validateRequired(req.body, ['dischargingDoctorId']);

  const admission = await AdmissionService.dischargePatient(
    id,
    facilityId,
    { dischargingDoctorId, dischargeReason, dischargeSummary },
    userId,
    ipAddress
  );

  successResponse(res, 'Patient discharged successfully', { admission });
});

export const getAdmissionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const stats = await AdmissionService.getAdmissionStats(facilityId);
    successResponse(res, 'Admission statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

export const transferPatient = withTransaction(async (req: Request, res: Response, tx: any) => {
  const facilityId = req.facilityId!;
  const userId = req.user?.id!;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const { id } = req.params;
  const { bedId, wardId } = req.body;

  validateRequired(req.body, ['bedId', 'wardId']);

  const admission = await AdmissionService.transferPatient(id, facilityId, bedId, wardId, userId, ipAddress);
  successResponse(res, 'Patient transferred successfully', { admission });
});

export const getInpatientConsultations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    
    const consultations = await AdmissionService.getInpatientConsultations(id, facilityId);
    successResponse(res, 'Inpatient consultations retrieved', { consultations });
  } catch (error) {
    next(error);
  }
};

export const createInpatientConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;
    const { id } = req.params;
    const { doctorId, diagnosis, notes } = req.body;

    validateRequired(req.body, ['doctorId']);

    const consultation = await AdmissionService.createInpatientConsultation(
      id, facilityId, { doctorId, diagnosis, notes }, userId
    );
    successResponse(res, 'Inpatient consultation created', { consultation }, 201);
  } catch (error) {
    next(error);
  }
};

export const calculateRoomCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    
    const charges = await AdmissionService.calculateRoomCharges(id, facilityId);
    successResponse(res, 'Room charges calculated', { charges });
  } catch (error) {
    next(error);
  }
};

export const createRoomCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;
    const { id } = req.params;
    
    const charges = await AdmissionService.createRoomCharges(id, facilityId, userId);
    successResponse(res, 'Room charges created', { charges }, 201);
  } catch (error) {
    next(error);
  }
};

export const getRoomCharges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    
    const charges = await AdmissionService.getRoomCharges(id, facilityId);
    successResponse(res, 'Room charges retrieved', { charges });
  } catch (error) {
    next(error);
  }
};