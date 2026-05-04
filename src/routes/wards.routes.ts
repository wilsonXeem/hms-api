import { Router, Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { wards } from '../models/wards.model';
import { beds } from '../models/beds.model';
import { authMiddleware } from '../middleware/auth.middleware';
import { successResponse } from '../utils/response.util';

const router = Router();
router.use(authMiddleware);

// GET /api/wards — all active wards for the facility
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilityId = req.facilityId!;
    const wardList = await db.select({
      id: wards.id,
      name: wards.name,
      code: wards.code,
      department: wards.department,
      wardType: wards.wardType,
      totalBeds: wards.totalBeds,
      availableBeds: wards.availableBeds,
      floor: wards.floor
    }).from(wards)
      .where(and(eq(wards.facilityId, facilityId), eq(wards.isActive, true)))
      .orderBy(wards.name);

    successResponse(res, 'Wards retrieved', { wards: wardList });
  } catch (error) { next(error); }
});

// GET /api/wards/:wardId/beds — available beds for a ward
router.get('/:wardId/beds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { wardId } = req.params;
    const bedList = await db.select({
      id: beds.id,
      bedNumber: beds.bedNumber,
      bedType: beds.bedType,
      isOccupied: beds.isOccupied
    }).from(beds)
      .where(and(eq(beds.wardId, wardId), eq(beds.isActive, true)))
      .orderBy(beds.bedNumber);

    successResponse(res, 'Beds retrieved', { beds: bedList });
  } catch (error) { next(error); }
});

export default router;
