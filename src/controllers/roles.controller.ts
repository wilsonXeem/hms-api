import { Request, Response } from 'express';
import { db } from '../config/database';
import { roles, userRoles } from '../models/roles.model';
import { and, eq } from 'drizzle-orm';

export class RolesController {
  async create(req: Request, res: Response) {
    try {
      const [role] = await db.insert(roles).values(req.body).returning();
      res.status(201).json(role);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create role' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const [role] = await db.select().from(roles)
        .where(eq(roles.id, req.params.id));
      if (!role) return res.status(404).json({ error: 'Role not found' });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const [role] = await db.update(roles)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(roles.id, req.params.id))
        .returning();
      if (!role) return res.status(404).json({ error: 'Role not found' });
      res.json(role);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update role' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await db.delete(roles).where(eq(roles.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }

  async assignUsers(req: Request, res: Response) {
    try {
      const { userIds } = req.body;
      const assignments = userIds.map((userId: string) => ({
        userId,
        roleId: req.params.id,
        assignedBy: req.user?.id
      }));
      await db.insert(userRoles).values(assignments);
      res.status(201).json({ message: 'Users assigned to role' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign users' });
    }
  }

  async removeUser(req: Request, res: Response) {
    try {
      await db.delete(userRoles)
        .where(and(eq(userRoles.userId, req.params.userId), eq(userRoles.roleId, req.params.id)));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove user from role' });
    }
  }
}
