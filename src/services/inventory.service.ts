import { eq, and, sql, lt, desc } from 'drizzle-orm';
import { db } from '../config/db.config';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { logger } from '../utils/logger.util';
import { NotificationService } from './notification.service';

export class InventoryService {
  // First Expired, First Out (FEFO) logic
  static async getBatchesForDispensing(itemId: string, quantityNeeded: number) {
    try {
      const batches = await db.select()
        .from(inventoryBatches)
        .where(and(
          eq(inventoryBatches.itemId, itemId),
          sql`${inventoryBatches.quantity} > 0`,
          sql`${inventoryBatches.expiryDate} > CURRENT_DATE`
        ))
        .orderBy(inventoryBatches.expiryDate); // FEFO

      const selectedBatches = [];
      let remainingQuantity = quantityNeeded;

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;
        
        const availableQuantity = Math.min(Number(batch.quantity), remainingQuantity);
        selectedBatches.push({
          ...batch,
          quantityToUse: availableQuantity
        });
        remainingQuantity -= availableQuantity;
      }

      return {
        batches: selectedBatches,
        totalAvailable: quantityNeeded - remainingQuantity,
        shortfall: remainingQuantity
      };
    } catch (error) {
      logger.error('Get batches for dispensing error:', error);
      throw error;
    }
  }

  static async updateStock(batchId: string, quantityUsed: number) {
    try {
      await db.update(inventoryBatches)
        .set({ quantity: sql`${inventoryBatches.quantity} - ${quantityUsed}` })
        .where(eq(inventoryBatches.id, batchId));

      logger.info(`Stock updated: batch ${batchId}, used ${quantityUsed}`);
    } catch (error) {
      logger.error('Update stock error:', error);
      throw error;
    }
  }

  static async checkLowStock(facilityId: string) {
    try {
      const lowStockItems = await db.select({
        itemId: inventoryItems.id,
        itemName: inventoryItems.name,
        minStockLevel: inventoryItems.minStockLevel,
        currentStock: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)`
      })
      .from(inventoryItems)
      .leftJoin(inventoryBatches, eq(inventoryItems.id, inventoryBatches.itemId))
      .where(eq(inventoryItems.facilityId, facilityId))
      .groupBy(inventoryItems.id, inventoryItems.name, inventoryItems.minStockLevel)
      .having(sql`COALESCE(SUM(${inventoryBatches.quantity}), 0) <= ${inventoryItems.minStockLevel}`);

      // Send notifications for low stock items
      for (const item of lowStockItems) {
        await NotificationService.sendInventoryAlert(
          facilityId,
          item.itemName,
          Number(item.currentStock),
          Number(item.minStockLevel)
        );
      }

      return lowStockItems;
    } catch (error) {
      logger.error('Check low stock error:', error);
      throw error;
    }
  }

  static async getExpiringItems(facilityId: string, days: number = 30) {
    try {
      return await db.select({
        itemName: inventoryItems.name,
        batchNumber: inventoryBatches.batchNumber,
        quantity: inventoryBatches.quantity,
        expiryDate: inventoryBatches.expiryDate
      })
      .from(inventoryBatches)
      .leftJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .where(and(
        eq(inventoryItems.facilityId, facilityId),
        sql`${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '${days} days'`,
        sql`${inventoryBatches.quantity} > 0`
      ))
      .orderBy(inventoryBatches.expiryDate);
    } catch (error) {
      logger.error('Get expiring items error:', error);
      throw error;
    }
  }
}