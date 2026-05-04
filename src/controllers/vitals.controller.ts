import { Request, Response } from 'express';
import { db } from '../config/database';
import { vitals } from '../models/vitals.model';
import { eq, and } from 'drizzle-orm';
import { withTransaction } from '../middleware/transaction.middleware';

export class VitalsController {
  create = withTransaction(async (req: Request, res: Response, tx: any) => {
    const [vital] = await tx.insert(vitals).values(req.body).returning();
    res.status(201).json(vital);
  });

  async getByPatient(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      const patientVitals = await db.select().from(vitals)
        .where(eq(vitals.patientId, patientId));
      res.json(patientVitals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vitals' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const [vital] = await db.select().from(vitals)
        .where(eq(vitals.id, req.params.id));
      if (!vital) return res.status(404).json({ error: 'Vital not found' });
      res.json(vital);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vital' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const [vital] = await db.update(vitals)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(vitals.id, req.params.id))
        .returning();
      if (!vital) return res.status(404).json({ error: 'Vital not found' });
      res.json(vital);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update vital' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await db.delete(vitals).where(eq(vitals.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete vital' });
    }
  }

  bulkCreate = withTransaction(async (req: Request, res: Response, tx: any) => {
    const createdVitals = await tx.insert(vitals).values(req.body).returning();
    res.status(201).json(createdVitals);
  });
}