import { config } from '../config/app.config';

// Test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/hms_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.REDIS_URL = '';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.SMTP_HOST = 'test-smtp';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

// Mock Redis before any imports
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    on: jest.fn(),
    isReady: false
  }))
}));

// Mock external services
jest.mock('../config/redis.config', () => ({
  connectRedis: jest.fn(),
  closeRedis: jest.fn(),
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    isReady: false
  }
}));

jest.mock('../services/realtime-notification.service', () => ({
  initializeRealTimeNotifications: jest.fn(),
  setRealTimeService: jest.fn(),
  sendNotification: jest.fn()
}));

jest.mock('../services/mail.service', () => ({
  MailService: {
    sendWelcome: jest.fn().mockResolvedValue(true),
    sendPasswordReset: jest.fn().mockResolvedValue(true),
    sendAppointmentConfirmation: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../services/cloudinary.service', () => ({
  uploadImage: jest.fn().mockResolvedValue({ secure_url: 'https://test.com/image.jpg' }),
  deleteImage: jest.fn().mockResolvedValue(true)
}));

// Global test utilities
(global as any).mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'doctor',
  facilityId: '123e4567-e89b-12d3-a456-426614174001'
};

(global as any).mockAuthToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';



// Setup and teardown
beforeAll(async () => {
  // Database setup would go here in a real test environment
});

afterAll(async () => {
  // Database cleanup would go here
});

beforeEach(() => {
  jest.clearAllMocks();
});