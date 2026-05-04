import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { successResponse, errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export const registerPatientWithAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientData, appointmentData } = req.body;

    const result = await WorkflowService.registerPatientWithAppointment(facilityId, patientData, appointmentData);
    
    successResponse(res, 'Patient registered with appointment successfully', result, 201);
  } catch (error) {
    logger.error('Register patient with appointment error:', error);
    next(error);
  }
};

export const completeConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const facilityId = req.facilityId!;
    const consultationData = { ...req.body, doctorId, facilityId };

    const result = await WorkflowService.completeConsultation(consultationData);
    
    successResponse(res, 'Consultation completed successfully', result, 201);
  } catch (error) {
    logger.error('Complete consultation error:', error);
    next(error);
  }
};

export const dispensePrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pharmacistId = req.user!.id;
    const { prescriptionId } = req.params;

    const dispensations = await WorkflowService.dispensePrescription(prescriptionId, pharmacistId);
    
    successResponse(res, 'Prescription dispensed successfully', { dispensations });
  } catch (error) {
    logger.error('Dispense prescription error:', error);
    next(error);
  }
};

export const createBillForConsultation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { consultationId } = req.params;
    const { services } = req.body;

    const bill = await WorkflowService.createBillForConsultation(consultationId, services);
    
    successResponse(res, 'Bill created successfully', bill, 201);
  } catch (error) {
    logger.error('Create bill error:', error);
    next(error);
  }
};

export const processLabResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uploadedBy = req.user!.id;
    const { requestId } = req.params;
    const resultData = req.body;

    const result = await WorkflowService.processLabResult(requestId, resultData, uploadedBy);
    
    successResponse(res, 'Lab result processed successfully', { result });
  } catch (error) {
    logger.error('Process lab result error:', error);
    next(error);
  }
};

export const scheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const appointmentData = req.body;

    const appointment = await WorkflowService.scheduleAppointment(facilityId, appointmentData);
    
    successResponse(res, 'Appointment scheduled successfully', { appointment }, 201);
  } catch (error) {
    logger.error('Schedule appointment error:', error);
    next(error);
  }
};

export const processEmergencyPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { patientData, doctorId } = req.body;

    const result = await WorkflowService.processEmergencyPatient(facilityId, patientData, doctorId);
    
    successResponse(res, 'Emergency patient processed successfully', result, 201);
  } catch (error) {
    logger.error('Process emergency patient error:', error);
    next(error);
  }
};