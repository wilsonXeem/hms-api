import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management and file operations
 */

// Apply auth middleware
router.use(authMiddleware);

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - patientId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               documentType:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid file or missing required fields
 */
router.post('/', documentController.uploadDocument);

/**
 * @swagger
 * /api/documents/search-content:
 *   post:
 *     summary: Search document content using OCR
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: OCR search completed
 */
router.post('/search-content', documentController.searchDocumentContent);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 */
router.get('/', documentController.getDocuments);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       404:
 *         description: Document not found
 */
router.get('/:id', documentController.getDocumentById);

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Delete document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router.delete('/:id', documentController.deleteDocument);

// Categories
router.post('/categories', documentController.createCategory);
router.get('/categories', documentController.getCategories);

// Permissions
router.post('/:id/share', documentController.shareDocument);

// Notifications
router.post('/notifications', documentController.scheduleNotification);

export default router;