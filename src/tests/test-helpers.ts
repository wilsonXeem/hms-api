import { Request, Response } from 'express';
import { generateToken } from '../utils/jwt.util';

export const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: (global as any).mockUser,
  ...overrides
});

export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();

export const createMockUser = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@test.com',
  role: 'doctor',
  facilityId: '123e4567-e89b-12d3-a456-426614174001',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockPatient = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174002',
  firstName: 'Jane',
  lastName: 'Smith',
  gender: 'female',
  dob: '1990-01-01',
  phone: '+1234567890',
  address: '123 Main St',
  emergencyContact: 'John Smith',
  bloodGroup: 'O+',
  facilityId: '123e4567-e89b-12d3-a456-426614174001',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockInventoryItem = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174003',
  name: 'Paracetamol',
  category: 'medication',
  unit: 'tablets',
  currentStock: 500,
  reorderLevel: 100,
  maxLevel: 1000,
  facilityId: '123e4567-e89b-12d3-a456-426614174001',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockLabRequest = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174004',
  patientId: '123e4567-e89b-12d3-a456-426614174002',
  requestedBy: '123e4567-e89b-12d3-a456-426614174000',
  tests: ['CBC', 'Blood Sugar'],
  priority: 'normal',
  status: 'pending',
  facilityId: '123e4567-e89b-12d3-a456-426614174001',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createAuthToken = (payload = {}) => {
  return generateToken({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'doctor',
    ...payload
  });
};

export const mockDbSelect = (returnValue: any[] = []) => ({
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(returnValue),
  orderBy: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis()
});

export const mockDbInsert = (returnValue: any[] = []) => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(returnValue)
});

export const mockDbUpdate = (returnValue: any[] = []) => ({
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue(returnValue)
});

export const mockDbDelete = (returnValue: any[] = []) => ({
  where: jest.fn().mockResolvedValue(returnValue)
});
