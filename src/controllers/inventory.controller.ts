import { Request, Response, NextFunction } from 'express';
import { eq, and, sql, lt, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { stockMovements } from '../models/stock-movements.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError, validateRequired } from '../utils/errors.util';

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { name, category, unit, minStockLevel } = req.body;
    
    validateRequired(req.body, ['name']);

    const [item] = await db.insert(inventoryItems).values({
      facilityId,
      name,
      category,
      unit,
      minStockLevel
    }).returning();

    logger.info(`Inventory item created: ${item.id} at facility ${facilityId}`);
    successResponse(res, 'Item created successfully', { item }, 201);
  } catch (error) {
    logger.error('Create item error:', error);
    next(error);
  }
};

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { search, category, limit = 50, offset = 0 } = req.query;

    let query = db.select().from(inventoryItems).where(eq(inventoryItems.facilityId, facilityId));
    
    if (search) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        sql`LOWER(${inventoryItems.name}) LIKE LOWER(${'%' + search + '%'})`
      ));
    }
    
    if (category) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        eq(inventoryItems.category, category as string)
      ));
    }

    const items = await query.limit(Number(limit)).offset(Number(offset));
    
    successResponse(res, 'Items retrieved successfully', { items });
  } catch (error) {
    logger.error('Get items error:', error);
    next(error);
  }
};

export const addBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId, batchNumber, quantity, expiryDate, supplier, costPrice, sellingPrice } = req.body;
    
    validateRequired(req.body, ['itemId', 'batchNumber', 'quantity', 'expiryDate']);

    const [batch] = await db.insert(inventoryBatches).values({
      itemId,
      batchNumber,
      quantity,
      expiryDate,
      supplier,
      costPrice,
      sellingPrice
    } as any).returning();

    logger.info(`Batch added: ${batch.id} for item ${itemId}`);
    successResponse(res, 'Batch added successfully', { batch }, 201);
  } catch (error) {
    logger.error('Add batch error:', error);
    next(error);
  }
};

export const getBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let query = db.select({
      id: inventoryBatches.id,
      itemId: inventoryBatches.itemId,
      itemName: inventoryItems.name,
      batchNumber: inventoryBatches.batchNumber,
      quantity: inventoryBatches.quantity,
      expiryDate: inventoryBatches.expiryDate,
      receivedDate: inventoryBatches.receivedDate,
      supplier: inventoryBatches.supplier,
      costPrice: inventoryBatches.costPrice,
      sellingPrice: inventoryBatches.sellingPrice,
      createdAt: inventoryBatches.createdAt
    })
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id));

    if (itemId) {
      query = query.where(eq(inventoryBatches.itemId, itemId));
    }

    const batches = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(inventoryBatches.createdAt));

    successResponse(res, 'Batches retrieved successfully', { batches });
  } catch (error) {
    logger.error('Get batches error:', error);
    next(error);
  }
};

export const getLowStockItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const lowStockItems = await db.select({
      itemId: inventoryItems.id,
      itemName: inventoryItems.name,
      category: inventoryItems.category,
      minStockLevel: inventoryItems.minStockLevel,
      totalStock: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)`
    })
    .from(inventoryItems)
    .leftJoin(inventoryBatches, eq(inventoryItems.id, inventoryBatches.itemId))
    .where(eq(inventoryItems.facilityId, facilityId))
    .groupBy(inventoryItems.id, inventoryItems.name, inventoryItems.category, inventoryItems.minStockLevel)
    .having(sql`COALESCE(SUM(${inventoryBatches.quantity}), 0) <= ${inventoryItems.minStockLevel}`);

    successResponse(res, 'Low stock items retrieved', { lowStockItems });
  } catch (error) {
    logger.error('Get low stock items error:', error);
    next(error);
  }
};

export const getExpiringBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { days = 30 } = req.query;

    const expiringBatches = await db.select({
      batchId: inventoryBatches.id,
      itemName: inventoryItems.name,
      batchNumber: inventoryBatches.batchNumber,
      quantity: inventoryBatches.quantity,
      expiryDate: inventoryBatches.expiryDate
    })
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '${days} days'`
    ));

    successResponse(res, 'Expiring batches retrieved', { expiringBatches });
  } catch (error) {
    logger.error('Get expiring batches error:', error);
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;
    const updateData = req.body;

    const [updatedItem] = await db.update(inventoryItems)
      .set(updateData)
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.facilityId, facilityId)
      ))
      .returning();

    if (!updatedItem) {
      throw new NotFoundError('Item');
    }

    logger.info(`Item updated: ${id} at facility ${facilityId}`);
    successResponse(res, 'Item updated successfully', { item: updatedItem });
  } catch (error) {
    logger.error('Update item error:', error);
    next(error);
  }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;

    const [deletedItem] = await db.delete(inventoryItems)
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.facilityId, facilityId)
      ))
      .returning();

    if (!deletedItem) {
      throw new NotFoundError('Item');
    }

    logger.info(`Item deleted: ${id} at facility ${facilityId}`);
    successResponse(res, 'Item deleted successfully');
  } catch (error) {
    logger.error('Delete item error:', error);
    next(error);
  }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [updatedBatch] = await db.update(inventoryBatches)
      .set(updateData)
      .where(eq(inventoryBatches.id, id))
      .returning();

    if (!updatedBatch) {
      throw new NotFoundError('Batch');
    }

    logger.info(`Batch updated: ${id}`);
    successResponse(res, 'Batch updated successfully', { batch: updatedBatch });
  } catch (error) {
    logger.error('Update batch error:', error);
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;
    
    validateRequired(req.body, ['adjustment']);

    // Get current stock from batches
    const batches = await db.select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.itemId, id));

    if (batches.length === 0) {
      throw new NotFoundError('Item batches');
    }

    // Apply adjustment to the most recent batch
    const latestBatch = batches.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const newQuantity = Number(latestBatch.quantity) + Number(adjustment);
    
    if (newQuantity < 0) {
      throw new ValidationError('Adjustment would result in negative stock');
    }

    await db.update(inventoryBatches)
      .set({ quantity: newQuantity.toString() })
      .where(eq(inventoryBatches.id, latestBatch.id));

    logger.info(`Stock adjusted: item ${id}, adjustment ${adjustment}, reason: ${reason}`);
    successResponse(res, 'Stock adjusted successfully');
  } catch (error) {
    logger.error('Adjust stock error:', error);
    next(error);
  }
};

export const getInventoryReports = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { type = 'summary', startDate, endDate } = req.query;

    let reportData: any = {};

    switch (type) {
      case 'summary':
        const totalItems = await db.select({ count: sql<number>`count(*)` })
          .from(inventoryItems)
          .where(eq(inventoryItems.facilityId, facilityId));
        
        const totalValue = await db.select({ 
          value: sql<number>`COALESCE(SUM(${inventoryBatches.quantity} * ${inventoryBatches.costPrice}), 0)` 
        })
        .from(inventoryBatches)
        .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
        .where(eq(inventoryItems.facilityId, facilityId));

        reportData = {
          totalItems: totalItems[0]?.count || 0,
          totalValue: totalValue[0]?.value || 0
        };
        break;

      case 'expiry':
        reportData.expiringItems = await db.select({
          itemName: inventoryItems.name,
          batchNumber: inventoryBatches.batchNumber,
          quantity: inventoryBatches.quantity,
          expiryDate: inventoryBatches.expiryDate,
          daysToExpiry: sql<number>`DATE_PART('day', ${inventoryBatches.expiryDate} - CURRENT_DATE)`
        })
        .from(inventoryBatches)
        .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
        .where(and(
          eq(inventoryItems.facilityId, facilityId),
          sql`${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '90 days'`
        ))
        .orderBy(inventoryBatches.expiryDate);
        break;

      case 'stock-movement':
        // This would require a stock movement tracking table
        reportData.message = 'Stock movement tracking not yet implemented';
        break;
    }

    successResponse(res, 'Report generated successfully', reportData);
  } catch (error) {
    logger.error('Get inventory reports error:', error);
    next(error);
  }
};

export const transferStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fromBatchId, toBatchId, quantity, reason } = req.body;
    
    validateRequired(req.body, ['fromBatchId', 'toBatchId', 'quantity']);

    // Get source batch
    const [fromBatch] = await db.select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.id, fromBatchId));

    if (!fromBatch) {
      throw new NotFoundError('Source batch');
    }

    if (Number(fromBatch.quantity) < Number(quantity)) {
      throw new ValidationError('Insufficient stock in source batch');
    }

    // Update source batch
    await db.update(inventoryBatches)
      .set({ quantity: (Number(fromBatch.quantity) - Number(quantity)).toString() })
      .where(eq(inventoryBatches.id, fromBatchId));

    // Update destination batch
    await db.update(inventoryBatches)
      .set({ quantity: sql`${inventoryBatches.quantity} + ${quantity}` })
      .where(eq(inventoryBatches.id, toBatchId));

    logger.info(`Stock transferred: ${quantity} from ${fromBatchId} to ${toBatchId}, reason: ${reason}`);
    successResponse(res, 'Stock transferred successfully');
  } catch (error) {
    logger.error('Transfer stock error:', error);
    next(error);
  }
};

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const suppliers = await db.select({
      supplier: inventoryBatches.supplier
    })
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`${inventoryBatches.supplier} IS NOT NULL`
    ))
    .groupBy(inventoryBatches.supplier);

    const supplierList = suppliers.map(s => s.supplier).filter(Boolean);
    
    successResponse(res, 'Suppliers retrieved successfully', { suppliers: supplierList });
  } catch (error) {
    logger.error('Get suppliers error:', error);
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const categories = await db.select({
      category: inventoryItems.category
    })
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.facilityId, facilityId),
      sql`${inventoryItems.category} IS NOT NULL`
    ))
    .groupBy(inventoryItems.category);

    const categoryList = categories.map(c => c.category).filter(Boolean);
    
    successResponse(res, 'Categories retrieved successfully', { categories: categoryList });
  } catch (error) {
    logger.error('Get categories error:', error);
    next(error);
  }
};

export const performStockTake = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user!.id;
    const { items } = req.body;

    validateRequired(req.body, ['items']);

    const adjustments = [];

    for (const item of items) {
      const { batchId, countedQuantity } = item;
      
      // Get current batch
      const [batch] = await db.select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.id, batchId));

      if (batch) {
        const currentQuantity = Number(batch.quantity);
        const adjustment = Number(countedQuantity) - currentQuantity;

        if (adjustment !== 0) {
          // Update batch quantity
          await db.update(inventoryBatches)
            .set({ quantity: countedQuantity.toString() })
            .where(eq(inventoryBatches.id, batchId));

          adjustments.push({
            batchId,
            itemId: batch.itemId,
            adjustment,
            previousQuantity: currentQuantity,
            newQuantity: countedQuantity
          });
        }
      }
    }

    logger.info(`Stock take performed by user ${userId}, ${adjustments.length} adjustments made`);
    successResponse(res, 'Stock take completed successfully', { adjustments });
  } catch (error) {
    logger.error('Perform stock take error:', error);
    next(error);
  }
};

export const getInventoryValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;

    const value = await db.select({
      totalValue: sql<number>`COALESCE(SUM(CAST(${inventoryBatches.quantity} AS NUMERIC) * CAST(${inventoryBatches.costPrice} AS NUMERIC)), 0)`
    })
    .from(inventoryBatches)
    .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
    .where(eq(inventoryItems.facilityId, facilityId));

    successResponse(res, 'Inventory value calculated', { totalValue: value[0]?.totalValue || 0 });
  } catch (error) {
    logger.error('Get inventory value error:', error);
    next(error);
  }
};

export const disposeBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason, quantity } = req.body;

    validateRequired(req.body, ['reason']);

    const [batch] = await db.select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.id, id));

    if (!batch) {
      throw new NotFoundError('Batch');
    }

    const disposeQuantity = quantity || batch.quantity;
    const newQuantity = Number(batch.quantity) - Number(disposeQuantity);

    // Update batch quantity
    await db.update(inventoryBatches)
      .set({ quantity: newQuantity.toString() })
      .where(eq(inventoryBatches.id, id));

    logger.info(`Batch disposed: ${id}, quantity: ${disposeQuantity}, reason: ${reason}`);
    successResponse(res, 'Batch disposed successfully');
  } catch (error) {
    logger.error('Dispose batch error:', error);
    next(error);
  }
};