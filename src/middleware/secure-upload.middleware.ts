import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import crypto from 'crypto';

const storage = multer.memoryStorage();

// Enhanced file validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  };
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  // Check if mime type is allowed
  if (!allowedTypes[mimeType as keyof typeof allowedTypes]) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, GIF, PDF, TXT, DOC, and DOCX files are allowed.'));
  }
  
  // Check if file extension matches mime type
  const allowedExtensions = allowedTypes[mimeType as keyof typeof allowedTypes];
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('File extension does not match file type.'));
  }
  
  // Additional security checks
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error('Invalid file name.'));
  }
  
  cb(null, true);
};

// Secure filename generation
export const generateSecureFilename = (originalName: string): string => {
  const extension = path.extname(originalName);
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${randomName}${extension}`;
};

// Virus scanning placeholder
export const virusScan = async (buffer: Buffer): Promise<boolean> => {
  const suspiciousPatterns = [
    Buffer.from('eval(', 'utf8'),
    Buffer.from('<script', 'utf8'),
    Buffer.from('javascript:', 'utf8'),
    Buffer.from('vbscript:', 'utf8')
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (buffer.includes(pattern)) {
      return false;
    }
  }
  
  return true;
};

export const secureUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB
    files: 5,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024
  },
});

export const secureUploadSingle = (fieldName: string) => secureUploadMiddleware.single(fieldName);
export const secureUploadMultiple = (fieldName: string, maxCount: number = 5) => 
  secureUploadMiddleware.array(fieldName, maxCount);