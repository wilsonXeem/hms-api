import { Router } from 'express';
import * as inventoryController from '../controllers/inventory.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { addFacilityContext } from '../middleware/facility.middleware';
import { cache, inventoryCache } from '../middleware/cache.middleware';
import { CacheInvalidator } from '../utils/cache-invalidation.util';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory and stock management operations
 */

// Apply auth and facility middleware
router.use(authMiddleware);
router.use(addFacilityContext);

// Item management
/**
 * @swagger
 * /api/inventory/items:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - minStockLevel
 *               - unitPrice
 *             properties:
 *               name:
 *                 type: string
 *                 example: Paracetamol 500mg
 *               category:
 *                 type: string
 *                 example: Medication
 *               minStockLevel:
 *                 type: number
 *                 example: 50
 *               unitPrice:
 *                 type: number
 *                 example: 2.50
 *               supplier:
 *                 type: string
 *                 example: PharmaCorp Ltd
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/items', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.createItem(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

/**
 * @swagger
 * /api/inventory/items:
 *   get:
 *     summary: Get all inventory items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search items by name
 *     responses:
 *       200:
 *         description: Items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/InventoryItem'
 */
router.get('/items', inventoryCache, inventoryController.getItems);

/**
 * @swagger
 * /api/inventory/items/{id}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Item not found
 */
router.put('/items/:id', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.updateItem(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

// Batch management
/**
 * @swagger
 * /api/inventory/batches:
 *   post:
 *     summary: Add new stock batch
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - batchNumber
 *               - quantity
 *               - expiryDate
 *             properties:
 *               itemId:
 *                 type: string
 *                 format: uuid
 *               batchNumber:
 *                 type: string
 *                 example: BATCH001
 *               quantity:
 *                 type: number
 *                 example: 100
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-31
 *     responses:
 *       201:
 *         description: Batch added successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/batches', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.addBatch(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

/**
 * @swagger
 * /api/inventory/items/{itemId}/batches:
 *   get:
 *     summary: Get batches for an item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/items/:itemId/batches', inventoryCache, inventoryController.getBatches);

// Stock monitoring
/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Get items with low stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/InventoryItem'
 */
router.get('/low-stock', inventoryCache, inventoryController.getLowStockItems);

/**
 * @swagger
 * /api/inventory/expiring:
 *   get:
 *     summary: Get batches expiring soon
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to check for expiry
 *     responses:
 *       200:
 *         description: Expiring batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/expiring', inventoryCache, inventoryController.getExpiringBatches);

// Stock adjustments
/**
 * @swagger
 * /api/inventory/items/{id}/adjust:
 *   post:
 *     summary: Adjust stock quantity
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustment
 *             properties:
 *               adjustment:
 *                 type: number
 *                 example: -5
 *               reason:
 *                 type: string
 *                 example: Damaged items
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
router.post('/items/:id/adjust', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.adjustStock(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

// Stock transfer
/**
 * @swagger
 * /api/inventory/transfer:
 *   post:
 *     summary: Transfer stock between batches
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromBatchId
 *               - toBatchId
 *               - quantity
 *             properties:
 *               fromBatchId:
 *                 type: string
 *                 format: uuid
 *               toBatchId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *                 example: 10
 *               reason:
 *                 type: string
 *                 example: Consolidation
 *     responses:
 *       200:
 *         description: Stock transferred successfully
 */
router.post('/transfer', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.transferStock(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

// Batch management
/**
 * @swagger
 * /api/inventory/batches/{id}:
 *   put:
 *     summary: Update batch information
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryBatch'
 *     responses:
 *       200:
 *         description: Batch updated successfully
 */
router.put('/batches/:id', roleMiddleware(['admin', 'pharmacist']), async (req, res, next) => {
  await inventoryController.updateBatch(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

// Get all batches
/**
 * @swagger
 * /api/inventory/batches:
 *   get:
 *     summary: Get all batches
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 */
router.get('/batches', inventoryCache, inventoryController.getBatches);

// Reports
/**
 * @swagger
 * /api/inventory/reports:
 *   get:
 *     summary: Get inventory reports
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [summary, expiry, stock-movement]
 *           default: summary
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.get('/reports', inventoryCache, inventoryController.getInventoryReports);

// Delete item
/**
 * @swagger
 * /api/inventory/items/{id}:
 *   delete:
 *     summary: Delete inventory item
 *     tags: [Inventory]
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
 *         description: Item deleted successfully
 */
router.delete('/items/:id', roleMiddleware(['admin']), async (req, res, next) => {
  await inventoryController.deleteItem(req, res, next);
  if (res.statusCode < 400) await CacheInvalidator.invalidateInventory();
});

export default router;