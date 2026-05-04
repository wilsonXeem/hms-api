import request from 'supertest';
import app from '../app';
import { db } from '../config/db.config';
import { inventoryItems } from '../models/inventory-items.model';
import { inventoryBatches } from '../models/inventory-batches.model';
import { createMockInventoryItem, mockDbSelect, mockDbInsert, mockDbUpdate, createAuthToken } from './test-helpers';

jest.mock('../config/db.config', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Inventory Controller', () => {
  const authToken = createAuthToken({ role: 'admin' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/inventory/items', () => {
    it('should create inventory item successfully', async () => {
      const itemData = {
        name: 'Paracetamol',
        category: 'medication',
        unit: 'tablets',
        reorderLevel: 100,
        maxLevel: 1000,
        description: 'Pain reliever'
      };

      const newItem = createMockInventoryItem(itemData);
      mockDb.insert.mockReturnValue(mockDbInsert([newItem]));

      const response = await request(app)
        .post('/api/inventory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.item.name).toBe(itemData.name);
    });

    it('should return error for missing required fields', async () => {
      const itemData = {
        category: 'medication'
      };

      const response = await request(app)
        .post('/api/inventory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid reorder level', async () => {
      const itemData = {
        name: 'Test Item',
        category: 'medication',
        unit: 'tablets',
        reorderLevel: -10,
        maxLevel: 1000
      };

      const response = await request(app)
        .post('/api/inventory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/inventory/items', () => {
    it('should get inventory items with pagination', async () => {
      const mockItems = [
        createMockInventoryItem({ name: 'Paracetamol' }),
        createMockInventoryItem({ name: 'Ibuprofen' })
      ];
      mockDb.select.mockReturnValue(mockDbSelect(mockItems));

      const response = await request(app)
        .get('/api/inventory/items?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
    });

    it('should search items by name', async () => {
      const mockItems = [createMockInventoryItem({ name: 'Paracetamol' })];
      mockDb.select.mockReturnValue(mockDbSelect(mockItems));

      const response = await request(app)
        .get('/api/inventory/items?search=Para')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should filter items by category', async () => {
      const mockItems = [createMockInventoryItem({ category: 'medication' })];
      mockDb.select.mockReturnValue(mockDbSelect(mockItems));

      const response = await request(app)
        .get('/api/inventory/items?category=medication')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('should return low stock items', async () => {
      const lowStockItems = [
        createMockInventoryItem({ name: 'Low Stock Item', currentStock: 50, reorderLevel: 100 })
      ];
      mockDb.select.mockReturnValue(mockDbSelect(lowStockItems));

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return empty array when no low stock items', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('PUT /api/inventory/items/:id', () => {
    it('should update inventory item successfully', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174003';
      const updateData = { name: 'Updated Item Name', reorderLevel: 150 };
      const updatedItem = createMockInventoryItem({ ...updateData, id: itemId });
      
      mockDb.update.mockReturnValue(mockDbUpdate([updatedItem]));

      const response = await request(app)
        .put(`/api/inventory/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.item.name).toBe(updateData.name);
    });

    it('should return 404 for non-existent item', async () => {
      mockDb.update.mockReturnValue(mockDbUpdate([]));

      const response = await request(app)
        .put('/api/inventory/items/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/inventory/items/:id/stock', () => {
    it('should add stock successfully', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174003';
      const stockData = {
        quantity: 100,
        batchNumber: 'BATCH001',
        expiryDate: '2025-12-31',
        supplier: 'Test Supplier',
        costPerUnit: 5.50
      };

      const mockItem = createMockInventoryItem({ id: itemId, currentStock: 500 });
      const newBatch = { id: 'batch-id', itemId, ...stockData };
      const updatedItem = { ...mockItem, currentStock: 600 };

      mockDb.select.mockReturnValue(mockDbSelect([mockItem]));
      mockDb.insert.mockReturnValue(mockDbInsert([newBatch]));
      mockDb.update.mockReturnValue(mockDbUpdate([updatedItem]));

      const response = await request(app)
        .post(`/api/inventory/items/${itemId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stockData);

      expect(response.status).toBe(201);
      expect(response.body.data.batch.quantity).toBe(stockData.quantity);
      expect(response.body.data.updatedStock).toBe(600);
    });

    it('should return error for invalid quantity', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174003';
      const stockData = {
        quantity: -10,
        batchNumber: 'BATCH001'
      };

      const response = await request(app)
        .post(`/api/inventory/items/${itemId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stockData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/inventory/expiring-soon', () => {
    it('should return items expiring within 30 days', async () => {
      const expiringItems = [
        {
          id: 'batch-1',
          itemName: 'Expiring Medicine',
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          quantity: 50
        }
      ];
      mockDb.select.mockReturnValue(mockDbSelect(expiringItems));

      const response = await request(app)
        .get('/api/inventory/expiring-soon')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should allow custom days parameter', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .get('/api/inventory/expiring-soon?days=60')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/inventory/stats', () => {
    it('should return inventory statistics', async () => {
      const mockStats = {
        totalItems: { count: 250 },
        lowStockItems: { count: 15 },
        expiringItems: { count: 8 },
        totalValue: { sum: 125000.50 }
      };

      mockDb.select
        .mockReturnValueOnce(mockDbSelect([mockStats.totalItems]))
        .mockReturnValueOnce(mockDbSelect([mockStats.lowStockItems]))
        .mockReturnValueOnce(mockDbSelect([mockStats.expiringItems]))
        .mockReturnValueOnce(mockDbSelect([mockStats.totalValue]));

      const response = await request(app)
        .get('/api/inventory/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalItems).toBe(250);
      expect(response.body.data.lowStockItems).toBe(15);
      expect(response.body.data.expiringItems).toBe(8);
    });
  });

  describe('DELETE /api/inventory/items/:id', () => {
    it('should delete inventory item successfully', async () => {
      const itemId = '123e4567-e89b-12d3-a456-426614174003';
      const mockItem = createMockInventoryItem({ id: itemId });
      
      mockDb.select.mockReturnValue(mockDbSelect([mockItem]));
      mockDb.delete.mockReturnValue({ where: jest.fn().mockResolvedValue([mockItem]) });

      const response = await request(app)
        .delete(`/api/inventory/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent item', async () => {
      mockDb.select.mockReturnValue(mockDbSelect([]));

      const response = await request(app)
        .delete('/api/inventory/items/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});