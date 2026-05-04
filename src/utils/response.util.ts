import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  error?: string
): Response => {
  const response: ApiResponse<T> = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined) response.data = data;
  if (error) response.error = error;

  return res.status(statusCode).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (
  res: Response,
  message: string,
  error?: string,
  statusCode: number = 400
): Response => {
  return sendResponse(res, statusCode, false, message, undefined, error);
};

export const formatResponse = <T>(
  success: boolean,
  message: string,
  data?: T
): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined) response.data = data;
  return response;
};

// Aliases for consistency
export const successResponse = sendSuccess;
export const errorResponse = sendError;

// Backward compatibility export
export const responseUtil = {
  sendResponse,
  sendSuccess,
  sendError,
  formatResponse,
  successResponse,
  errorResponse
};