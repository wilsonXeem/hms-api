import { Request, Response, NextFunction } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { purchaseOrders } from '../models/purchase-orders.model';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { stockMovements } from '../models/stock-movements.model';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { ValidationError, NotFoundError, validateRequired } from '../utils/errors.util';

export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;
    const { supplier, items, expectedDelivery, notes } = req.body;
    
    validateRequired(req.body, ['supplier', 'items']);

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Items array is required and cannot be empty');
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => 
      sum + (Number(item.quantity) * Number(item.unitPrice || 0)), 0
    );

    // Generate order number
    const orderNumber = `PO-${Date.now()}`;

    const [order] = await db.insert(purchaseOrders).values({
      facilityId,
      orderNumber,
      supplier,
      items,
      totalAmount: totalAmount.toString(),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes,
      requestedBy: userId
    }).returning();

    logger.info(`Purchase order created: ${order.id} by user ${userId}`);
    successResponse(res, 'Purchase order created successfully', { order }, 201);
  } catch (error) {
    logger.error('Create purchase order error:', error);
    next(error);
  }
};

export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = db.select().from(purchaseOrders).where(eq(purchaseOrders.facilityId, facilityId));
    
    if (status) {
      query = query.where(and(
        eq(purchaseOrders.facilityId, facilityId),
        eq(purchaseOrders.status, status as string)
      ));
    }

    const orders = await query
      .limit(Number(limit))
      .offset(Number(offset))
      .orderBy(desc(purchaseOrders.createdAt));

    successResponse(res, 'Purchase orders retrieved successfully', { orders });
  } catch (error) {
    logger.error('Get purchase orders error:', error);
    next(error);
  }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;
    const { id } = req.params;
    const { status, notes } = req.body;

    validateRequired(req.body, ['status']);

    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    const [updatedOrder] = await db.update(purchaseOrders)
      .set(updateData)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.facilityId, facilityId)
      ))
      .returning();

    if (!updatedOrder) {
      throw new NotFoundError('Purchase order');
    }

    logger.info(`Purchase order ${id} status updated to ${status} by user ${userId}`);
    successResponse(res, 'Purchase order updated successfully', { order: updatedOrder });
  } catch (error) {
    logger.error('Update purchase order error:', error);
    next(error);
  }
};

export const receivePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const userId = req.user?.id!;
    const { id } = req.params;
    const { receivedItems } = req.body;

    validateRequired(req.body, ['receivedItems']);

    // Get the purchase order
    const [order] = await db.select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.facilityId, facilityId)
      ));

    if (!order) {
      throw new NotFoundError('Purchase order');
    }

    // Process received items and create batches
    for (const receivedItem of receivedItems) {
      const { itemId, quantity, batchNumber, expiryDate, costPrice } = receivedItem;

      // Create inventory batch
      const [batch] = await db.insert(inventoryBatches).values({
        itemId,
        batchNumber,
        quantity: quantity.toString(),
        expiryDate,
        supplier: order.supplier,
        costPrice: costPrice?.toString()
      }).returning();

      // Record stock movement
      await db.insert(stockMovements).values({
        itemId,
        batchId: batch.id,
        movementType: 'in',
        quantity: quantity.toString(),
        reason: 'Purchase Order Receipt',
        performedBy: userId,
        referenceId: order.id,
        referenceType: 'purchase_order'
      });
    }

    // Update purchase order status
    await db.update(purchaseOrders)
      .set({
        status: 'received',
        receivedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id));

    logger.info(`Purchase order ${id} received by user ${userId}`);
    successResponse(res, 'Purchase order received successfully');
  } catch (error) {
    logger.error('Receive purchase order error:', error);
    next(error);
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const { id } = req.params;

    const [order] = await db.select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.facilityId, facilityId)
      ));

    if (!order) {
      throw new NotFoundError('Purchase order');
    }

    successResponse(res, 'Purchase order retrieved successfully', { order });
  } catch (error) {
    logger.error('Get purchase order error:', error);
    next(error);
  }
};
