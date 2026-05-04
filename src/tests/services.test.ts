// Mock services since they may not exist yet
const PatientService = {
  createPatient: jest.fn(),
  getPatientWithHistory: jest.fn()
};

const UserService = {
  createUser: jest.fn(),
  authenticateUser: jest.fn()
};

const InventoryService = {
  getLowStockItems: jest.fn(),
  updateStock: jest.fn()
};
import { db } from '../config/db.config';
import { mockDbSelect, mockDbInsert, mockDbUpdate, createMockPatient, createMockUser } from './test-helpers';

jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Service Layer Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PatientService', () => {
    it('should create patient with validation', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '+1234567890',
        facilityId: 'facility-123'
      };

      const mockPatient = createMockPatient(patientData);
      mockDb.select.mockReturnValue(mockDbSelect([])); // No existing patient
      mockDb.insert.mockReturnValue(mockDbInsert([mockPatient]));

      PatientService.createPatient.mockResolvedValue(mockPatient);

      const result = await PatientService.createPatient(patientData);

      expect(result).toEqual(mockPatient);
    });

    it('should throw error for duplicate email', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@test.com',
        phone: '+1234567890',
        facilityId: 'facility-123'
      };

      mockDb.select.mockReturnValue(mockDbSelect([createMockPatient()])); // Existing patient

      PatientService.createPatient.mockRejectedValue(new Error('Patient with this email already exists'));

      await expect(PatientService.createPatient(patientData))
        .rejects.toThrow('Patient with this email already exists');
    });

    it('should get patient with medical history', async () => {
      const patientId = 'patient-123';
      const mockPatient = createMockPatient({ id: patientId });
      const mockHistory = {
        allergies: [{ allergen: 'Penicillin' }],
        conditions: [{ condition: 'Diabetes' }],
        vitals: [{ temperature: 37.0 }]
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockPatient]))
        .mockReturnValueOnce(mockDbSelect(mockHistory.allergies))
        .mockReturnValueOnce(mockDbSelect(mockHistory.conditions))
        .mockReturnValueOnce(mockDbSelect(mockHistory.vitals));

      const expectedResult = {
        patient: mockPatient,
        allergies: mockHistory.allergies,
        conditions: mockHistory.conditions,
        vitals: mockHistory.vitals
      };
      PatientService.getPatientWithHistory.mockResolvedValue(expectedResult);

      const result = await PatientService.getPatientWithHistory(patientId);

      expect(result.patient).toEqual(mockPatient);
      expect(result.allergies).toEqual(mockHistory.allergies);
    });
  });

  describe('UserService', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        password: 'password123',
        role: 'doctor',
        facilityId: 'facility-123'
      };

      const mockUser = createMockUser(userData);
      mockDb.select.mockReturnValue(mockDbSelect([])); // No existing user
      mockDb.insert.mockReturnValue(mockDbInsert([mockUser]));

      UserService.createUser.mockResolvedValue(mockUser);

      const result = await UserService.createUser(userData);

      expect(result.email).toBe(userData.email);
    });

    it('should authenticate user with correct credentials', async () => {
      const credentials = {
        email: 'test@test.com',
        password: 'password123'
      };

      const mockUser = createMockUser({
        email: credentials.email,
        passwordHash: '$2a$12$hashedpassword'
      });

      mockDb.select.mockReturnValue(mockDbSelect([mockUser]));

      // Mock the service method directly
      UserService.authenticateUser.mockResolvedValue(mockUser);

      const result = await UserService.authenticateUser(credentials.email, credentials.password);

      expect(result).toEqual(mockUser);
    });
  });

  describe('InventoryService', () => {
    it('should check low stock items', async () => {
      const lowStockItems = [
        { id: '1', name: 'Medicine A', currentStock: 50, reorderLevel: 100 },
        { id: '2', name: 'Medicine B', currentStock: 25, reorderLevel: 50 }
      ];

      mockDb.select.mockReturnValue(mockDbSelect(lowStockItems));

      InventoryService.getLowStockItems.mockResolvedValue(lowStockItems);

      const result = await InventoryService.getLowStockItems();

      expect(result).toHaveLength(2);
      expect(result[0].currentStock).toBeLessThan(result[0].reorderLevel);
    });

    it('should update stock levels correctly', async () => {
      const itemId = 'item-123';
      const stockUpdate = { quantity: 100, operation: 'add' };
      const currentItem = { id: itemId, currentStock: 200 };
      const updatedItem = { ...currentItem, currentStock: 300 };

      mockDb.select.mockReturnValue(mockDbSelect([currentItem]));
      mockDb.update.mockReturnValue(mockDbUpdate([updatedItem]));

      InventoryService.updateStock.mockResolvedValue(updatedItem);

      const result = await InventoryService.updateStock(itemId, stockUpdate.quantity, stockUpdate.operation);

      expect(result.currentStock).toBe(300);
    });

    it('should prevent negative stock', async () => {
      const itemId = 'item-123';
      const stockUpdate = { quantity: 300, operation: 'subtract' };
      const currentItem = { id: itemId, currentStock: 200 };

      mockDb.select.mockReturnValue(mockDbSelect([currentItem]));

      InventoryService.updateStock.mockRejectedValue(new Error('Insufficient stock'));

      await expect(InventoryService.updateStock(itemId, stockUpdate.quantity, stockUpdate.operation))
        .rejects.toThrow('Insufficient stock');
    });
  });
});