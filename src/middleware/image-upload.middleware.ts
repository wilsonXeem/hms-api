import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ImageOptimizationService } from '../services/image-optimization.service';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  }
};

// Configure multer
export const imageUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

// Middleware to optimize uploaded images
export const optimizeImageMiddleware = async (req: Request, res: any, next: any) => {
  try {
    if (!req.file) {
      return next();
    }

    const inputPath = req.file.path;
    const optimizedFileName = ImageOptimizationService.getOptimizedFileName(req.file.filename);
    const outputPath = path.join(uploadDir, optimizedFileName);

    // Validate image
    const isValid = await ImageOptimizationService.validateImage(inputPath);
    if (!isValid) {
      // Clean up invalid file
      fs.unlinkSync(inputPath);
      return res.status(400).json({ error: 'Invalid image file' });
    }

    // Optimize logo
    await ImageOptimizationService.optimizeLogo(inputPath, outputPath);

    // Update file info
    req.file.path = outputPath;
    req.file.filename = optimizedFileName;

    next();
  } catch (error) {
    // Clean up files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Image processing failed' });
  }
};