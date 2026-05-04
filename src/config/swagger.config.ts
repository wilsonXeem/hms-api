import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './app.config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      version: '1.0.0',
      description: `
        Comprehensive API for ProgrammoCeuticals Hospital Management System.
        
        ## Features
        - User authentication and authorization
        - Patient management
        - Inventory and stock management
        - Laboratory test requests and results
        - Pharmacy operations
        - Doctor consultations
        - Payment processing
        - Administrative functions
        
        ## Authentication
        Most endpoints require authentication using Bearer tokens. Use the /api/auth/login endpoint to obtain a token.
      `,
      contact: {
        name: 'API Support',
        email: 'contact@programmaceuticals.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: config.nodeEnv === 'production' ? 'https://api.yourdomain.com' : `http://localhost:${config.port}`,
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist'] },
            phone: { type: 'string' },
            department: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        UserRegistration: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role', 'facilityId'],
          properties: {
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@hospital.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
            role: { type: 'string', enum: ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'receptionist'] },
            phone: { type: 'string', example: '+1234567890' },
            department: { type: 'string', example: 'Cardiology' },
            facilityId: { type: 'string', format: 'uuid' }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john.doe@hospital.com' },
            password: { type: 'string', example: 'password123' }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientCode: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
            dob: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            address: { type: 'string' },
            emergencyContact: { type: 'string' },
            bloodGroup: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PatientCreate: {
          type: 'object',
          required: ['firstName', 'lastName', 'gender'],
          properties: {
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Smith' },
            gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'female' },
            dob: { type: 'string', format: 'date', example: '1990-01-15' },
            phone: { type: 'string', example: '+1234567890' },
            address: { type: 'string', example: '123 Main St, City, State' },
            emergencyContact: { type: 'string', example: 'John Smith - +0987654321' },
            bloodGroup: { type: 'string', example: 'A+' }
          }
        },
        PatientAllergy: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            allergen: { type: 'string', example: 'Penicillin' },
            severity: { type: 'string', enum: ['mild', 'moderate', 'severe'], example: 'moderate' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PatientCondition: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            condition: { type: 'string', example: 'Hypertension' },
            diagnosedDate: { type: 'string', format: 'date', example: '2023-01-15' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Prescription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            consultationId: { type: 'string', format: 'uuid' },
            prescribedBy: { type: 'string', format: 'uuid' },
            remarks: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/PrescriptionItem' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        PrescriptionItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            drugName: { type: 'string' },
            dosage: { type: 'string' },
            frequency: { type: 'string' },
            duration: { type: 'string' },
            quantityPrescribed: { type: 'number' }
          }
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            category: { type: 'string' },
            currentStock: { type: 'number' },
            minStockLevel: { type: 'number' },
            unitPrice: { type: 'number' },
            supplier: { type: 'string' },
            expiryDate: { type: 'string', format: 'date' }
          }
        },
        LabRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            requestedBy: { type: 'string', format: 'uuid' },
            testType: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            doctorId: { type: 'string', format: 'uuid' },
            chiefComplaint: { type: 'string' },
            diagnosis: { type: 'string' },
            treatment: { type: 'string' },
            followUpDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            paymentMethod: { type: 'string', enum: ['cash', 'card', 'insurance', 'bank_transfer'] },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            description: { type: 'string' },
            transactionId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Vitals: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            patientId: { type: 'string', format: 'uuid' },
            recordedBy: { type: 'string', format: 'uuid' },
            bloodPressure: { type: 'string', example: '120/80' },
            bloodPressureSystolic: { type: 'number', example: 120 },
            bloodPressureDiastolic: { type: 'number', example: 80 },
            temperature: { type: 'number', example: 98.6 },
            pulse: { type: 'number', example: 72 },
            heartRate: { type: 'number', example: 72 },
            respiration: { type: 'number', example: 16 },
            respiratoryRate: { type: 'number', example: 16 },
            weight: { type: 'number', example: 70.5 },
            height: { type: 'number', example: 175 },
            oxygenSaturation: { type: 'number', example: 98 },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        VitalsCreate: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'string', format: 'uuid' },
            bloodPressureSystolic: { type: 'number', minimum: 50, maximum: 300, example: 120 },
            bloodPressureDiastolic: { type: 'number', minimum: 30, maximum: 200, example: 80 },
            heartRate: { type: 'number', minimum: 30, maximum: 250, example: 72 },
            temperature: { type: 'number', minimum: 30, maximum: 50, example: 98.6 },
            respiratoryRate: { type: 'number', minimum: 5, maximum: 60, example: 16 },
            oxygenSaturation: { type: 'number', minimum: 50, maximum: 100, example: 98 },
            weight: { type: 'number', minimum: 0.5, maximum: 500, example: 70.5 },
            height: { type: 'number', minimum: 30, maximum: 300, example: 175 }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);