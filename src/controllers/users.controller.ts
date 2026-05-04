import { Request, Response } from 'express';
import { db } from '../config/database';
import { users } from '../models/users.model';
import { userRoles, roles } from '../models/roles.model';
import { eq } from 'drizzle-orm';
import { auditLogger } from '../middleware/audit-logger.middleware';
import { withTransaction } from '../middleware/transaction.middleware';
import { EncryptionUtil } from '../utils/encryption.util';

export class UsersController {
  create = withTransaction(async (req: Request, res: Response, tx: any) => {
    const userData = { ...req.body };
    if (userData.passwordHash) {
      userData.passwordHash = EncryptionUtil.hashPassword(userData.passwordHash);
    }
    const [user] = await tx.insert(users).values(userData).returning();
    res.status(201).json(user);
  });

  async getAll(req: Request, res: Response) {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const [user] = await db.select().from(users)
        .where(eq(users.id, req.params.id));
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const [user] = await db.update(users)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(users.id, req.params.id))
        .returning();
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  async bulkCreate(req: Request, res: Response) {
    try {
      const createdUsers = await db.insert(users).values(req.body).returning();
      res.status(201).json(createdUsers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk create users' });
    }
  }

  async bulkUpdate(req: Request, res: Response) {
    try {
      const updates = req.body;
      const results = [];
      for (const update of updates) {
        const [user] = await db.update(users)
          .set({ ...update, updatedAt: new Date() })
          .where(eq(users.id, update.id))
          .returning();
        results.push(user);
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk update users' });
    }
  }

  assignRoles = withTransaction(async (req: Request, res: Response, tx: any) => {
    const { roleIds } = req.body;
    const assignments = roleIds.map((roleId: string) => ({
      userId: req.params.id,
      roleId,
      assignedBy: req.user?.id
    }));
    await tx.insert(userRoles).values(assignments);
    res.status(201).json({ message: 'Roles assigned to user' });
  });

  async getUserRoles(req: Request, res: Response) {
    try {
      const userRolesList = await db.select({
        roleId: roles.id,
        roleName: roles.name,
        permissions: roles.permissions
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, req.params.id));
      res.json(userRolesList);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user roles' });
    }
  }
}