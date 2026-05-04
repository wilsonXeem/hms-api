import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authConfig } from '../config/auth.config';

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, authConfig.bcrypt.saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// UUID utilities
export const generateId = (): string => uuidv4();

// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const generatePatientId = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PAT${timestamp}${random}`;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `RCP${timestamp}${random}`;
};

// Pagination utilities
export const getPaginationParams = (page?: string, limit?: string) => {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '10', 10);
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset
  };
};