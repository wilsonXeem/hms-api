import { Request, Response, NextFunction } from 'express';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../config/db.config';
import { stockMovements } from '../models/stock-movements.model';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { users } from '../models/users.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ValidationError, validateRequired } from '../utils/errors.util';

export const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { 
      startDate, 
      endDate, 
      itemId, 
      movementType, 
      limit = 100, 
      offset = 0 
    } = req.query;

    let query = db.select({
      id: stockMovements.id,
      itemName: inventoryItems.name,
      batchNumber: inventoryBatches.batchNumber,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      previousQuantity: stockMovements.previousQuantity,
      newQuantity: stockMovements.newQuantity,
      reason: stockMovements.reason,
      notes: stockMovements.notes,
      userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      referenceType: stockMovements.referenceType,
      createdAt: stockMovements.createdAt
    })
    .from(stockMovements)
    .leftJoin(inventoryItems, eq(stockMovements.itemId, inventoryItems.id))
    .leftJoin(inventoryBatches, eq(stockMovements.batchId, inventoryBatches.id))
    .leftJoin(users, eq(stockMovements.performedBy, users.id))
    .where(eq(inventoryItems.facilityId, facilityId));

    // Apply filters
    if (startDate) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        gte(stockMovements.createdAt, new Date(startDate as string))
      ));
    }

    if (endDate) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        lte(stockMovements.createdAt, new Date(endDate as string))
      ));
    }

    if (itemId) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        eq(stockMovements.itemId, itemId as string)
      ));
    }

    if (movementType) {
      query = query.where(and(
        eq(inventoryItems.facilityId, facilityId),
        eq(stockMovements.movementType, movementType as string)
      ));
    }

    const movements = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(stockMovements.createdAt));

    successResponse(res, 'Stock movements retrieved successfully', { movements });
  } catch (error) {
    logger.error('Get stock movements error:', error);
    next(error);
  }
};

export const createStockMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id!;
    const { 
      itemId, 
      batchId, 
      movementType, 
      quantity, 
      reason, 
      notes,
      referenceId,
      referenceType
    } = req.body;

    validateRequired(req.body, ['itemId', 'movementType', 'quantity']);

    // Get current batch quantity if batchId provided
    let previousQuantity = null;
    let newQuantity = null;

    if (batchId) {
      const [batch] = await db.select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.id, batchId));

      if (batch) {
        previousQuantity = batch.quantity;
        const quantityChange = movementType === 'out' || movementType === 'disposal' 
          ? -Number(quantity) 
          : Number(quantity);
        newQuantity = (Number(previousQuantity) + quantityChange).toString();

        // Update batch quantity
        await db.update(inventoryBatches)
          .set({ quantity: newQuantity })
          .where(eq(inventoryBatches.id, batchId));
      }
    }

    const [movement] = await db.insert(stockMovements).values({
      itemId,
      batchId,
      movementType,
      quantity: quantity.toString(),
      previousQuantity,
      newQuantity,
      reason,
      notes,
      performedBy: userId,
      referenceId,
      referenceType
    }).returning();

    logger.info(`Stock movement recorded: ${movement.id} by user ${userId}`);
    successResponse(res, 'Stock movement recorded successfully', { movement }, 201);
  } catch (error) {
    logger.error('Create stock movement error:', error);
    next(error);
  }
};

export const getStockMovementStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { startDate, endDate } = req.query;

    let whereCondition = eq(inventoryItems.facilityId, facilityId);

    if (startDate && endDate) {
      whereCondition = and(
        eq(inventoryItems.facilityId, facilityId),
        gte(stockMovements.createdAt, new Date(startDate as string)),
        lte(stockMovements.createdAt, new Date(endDate as string))
      );
    }

    const stats = await db.select({
      movementType: stockMovements.movementType,
      totalQuantity: sql<number>`SUM(CAST(${stockMovements.quantity} AS NUMERIC))`,
      count: sql<number>`COUNT(*)`
    })
    .from(stockMovements)
    .leftJoin(inventoryItems, eq(stockMovements.itemId, inventoryItems.id))
    .where(whereCondition)
    .groupBy(stockMovements.movementType);

    const formattedStats = {
      totalIn: 0,
      totalOut: 0,
      totalAdjustments: 0,
      totalTransfers: 0,
      totalDisposals: 0
    };

    stats.forEach(stat => {
      switch (stat.movementType) {
        case 'in':
          formattedStats.totalIn = Number(stat.totalQuantity);
          break;
        case 'out':
          formattedStats.totalOut = Number(stat.totalQuantity);
          break;
        case 'adjustment':
          formattedStats.totalAdjustments = Number(stat.totalQuantity);
          break;
        case 'transfer':
          formattedStats.totalTransfers = Number(stat.totalQuantity);
          break;
        case 'disposal':
          formattedStats.totalDisposals = Number(stat.totalQuantity);
          break;
      }
    });

    successResponse(res, 'Stock movement statistics retrieved', formattedStats);
  } catch (error) {
    logger.error('Get stock movement stats error:', error);
    next(error);
  }
};

export const getItemStockHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { itemId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await db.select({
      id: stockMovements.id,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      previousQuantity: stockMovements.previousQuantity,
      newQuantity: stockMovements.newQuantity,
      reason: stockMovements.reason,
      batchNumber: inventoryBatches.batchNumber,
      userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      createdAt: stockMovements.createdAt
    })
    .from(stockMovements)
    .leftJoin(inventoryBatches, eq(stockMovements.batchId, inventoryBatches.id))
    .leftJoin(users, eq(stockMovements.performedBy, users.id))
    .leftJoin(inventoryItems, eq(stockMovements.itemId, inventoryItems.id))
    .where(and(
      eq(stockMovements.itemId, itemId),
      eq(inventoryItems.facilityId, facilityId)
    ))
    .limit(Number(limit))
    .offset(Number(offset))
    .orderBy(desc(stockMovements.createdAt));

    successResponse(res, 'Item stock history retrieved successfully', { history });
  } catch (error) {
    logger.error('Get item stock history error:', error);
    next(error);
  }
};
