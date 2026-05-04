import { eq, and, like, desc, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.config';
import { users } from '../models/users.model';
import { facilities } from '../models/facilities.model';
import { activityLogs } from '../models/activity-logs.model';
import { patients } from '../models/patients.model';
import { consultations } from '../models/consultations.model';
import { payments } from '../models/payments.model';
import { roles } from '../models/roles.model';
import { wards } from '../models/wards.model';
import { beds } from '../models/beds.model';
import { moduleConfigurations } from '../models/module-configurations.model';

export class AdminService {

  // ── Users ──────────────────────────────────────────────────────────────────

  static async getUsers(facilityId: string, search?: string, limit = 50, offset = 0) {
    const rows = await db.select({
      id: users.id, firstName: users.firstName, lastName: users.lastName,
      email: users.email, role: users.role, department: users.department,
      phone: users.phone, isActive: users.isActive, createdAt: users.createdAt
    }).from(users)
      .where(
        search
          ? and(eq(users.facilityId, facilityId), like(users.firstName, `%${search}%`))
          : eq(users.facilityId, facilityId)
      )
      .limit(limit).offset(offset).orderBy(desc(users.createdAt));

    return rows.map(u => ({
      ...u,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null
    }));
  }

  static async createUser(facilityId: string, userData: any) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const [newUser] = await db.insert(users).values({
      facilityId, firstName: userData.firstName, lastName: userData.lastName,
      email: userData.email, passwordHash, role: userData.role,
      department: userData.department, phone: userData.phone
    }).returning({
      id: users.id, firstName: users.firstName, lastName: users.lastName,
      email: users.email, role: users.role, department: users.department,
      phone: users.phone, isActive: users.isActive
    });
    return newUser;
  }

  static async updateUser(facilityId: string, userId: string, updateData: any) {
    const [updatedUser] = await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.facilityId, facilityId)))
      .returning({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        email: users.email, role: users.role, department: users.department,
        phone: users.phone, isActive: users.isActive
      });
    return updatedUser;
  }

  static async deactivateUser(facilityId: string, userId: string) {
    const [user] = await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.facilityId, facilityId)))
      .returning();
    return user;
  }

  // ── Facility ───────────────────────────────────────────────────────────────

  static async getFacilitySettings(facilityId: string) {
    const [facility] = await db.select().from(facilities)
      .where(eq(facilities.id, facilityId)).limit(1);
    return facility;
  }

  static async updateFacilitySettings(facilityId: string, settings: any) {
    const [updated] = await db.update(facilities)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(facilities.id, facilityId))
      .returning();
    return updated;
  }

  // ── Stats & Operations ─────────────────────────────────────────────────────

  static async getSystemStats(facilityId: string) {
    const stats = await db.select({
      totalUsers:        sql<number>`COUNT(DISTINCT ${users.id})`,
      totalPatients:     sql<number>`COUNT(DISTINCT ${patients.id})`,
      totalConsultations:sql<number>`COUNT(DISTINCT ${consultations.id})`,
      totalRevenue:      sql<number>`SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END)`,
      activeUsers:       sql<number>`COUNT(DISTINCT CASE WHEN ${users.isActive} = true THEN ${users.id} END)`
    })
    .from(users)
    .leftJoin(patients, eq(users.facilityId, patients.facilityId))
    .leftJoin(consultations, eq(patients.id, consultations.patientId))
    .leftJoin(payments, eq(patients.id, payments.patientId))
    .where(eq(users.facilityId, facilityId));
    return stats[0];
  }

  static async getOperationsSummary(facilityId: string) {
    const [wardRows, moduleRows] = await Promise.all([
      db.select({
        id: wards.id, name: wards.name, department: wards.department,
        totalBeds: wards.totalBeds, availableBeds: wards.availableBeds,
        wardType: wards.wardType, isActive: wards.isActive,
        occupiedBeds: sql<number>`COUNT(CASE WHEN ${beds.isOccupied} = true THEN 1 END)`
      })
        .from(wards)
        .leftJoin(beds, eq(wards.id, beds.wardId))
        .where(and(eq(wards.facilityId, facilityId), eq(wards.isActive, true)))
        .groupBy(wards.id)
        .orderBy(wards.name),
      db.select({
        id: moduleConfigurations.id, name: moduleConfigurations.moduleName,
        enabled: moduleConfigurations.isEnabled, configuration: moduleConfigurations.configuration
      })
        .from(moduleConfigurations)
        .where(eq(moduleConfigurations.facilityId, facilityId))
        .orderBy(moduleConfigurations.moduleName)
    ]);

    return {
      wards: wardRows.map(w => ({
        id: w.id, name: w.name, department: w.department,
        beds: Number(w.totalBeds || 0), occupied: Number(w.occupiedBeds || 0),
        available: Number(w.availableBeds || 0), wardType: w.wardType, isActive: w.isActive
      })),
      modules: moduleRows.map(m => ({
        id: m.id, name: m.name, enabled: !!m.enabled, configuration: m.configuration
      }))
    };
  }

  // ── Wards ──────────────────────────────────────────────────────────────────

  static async createWard(facilityId: string, wardData: any) {
    const [newWard] = await db.insert(wards).values({
      facilityId,
      name: wardData.name,
      code: wardData.code || wardData.name.substring(0, 3).toUpperCase(),
      department: wardData.nurseLead || wardData.department || '',
      totalBeds: Number(wardData.beds || 0),
      availableBeds: Number(wardData.beds || 0),
      wardType: wardData.wardType || 'general',
      isActive: true,
    }).returning({
      id: wards.id, name: wards.name, department: wards.department,
      totalBeds: wards.totalBeds, availableBeds: wards.availableBeds,
      wardType: wards.wardType, isActive: wards.isActive
    });
    return newWard;
  }

  static async updateWard(facilityId: string, wardId: string, wardData: any) {
    const [updated] = await db.update(wards)
      .set({
        name: wardData.name,
        department: wardData.nurseLead || wardData.department,
        totalBeds: Number(wardData.beds || 0),
        availableBeds: Number(wardData.beds || 0) - Number(wardData.occupied || 0),
        updatedAt: new Date(),
      })
      .where(and(eq(wards.id, wardId), eq(wards.facilityId, facilityId)))
      .returning({
        id: wards.id, name: wards.name, department: wards.department,
        totalBeds: wards.totalBeds, availableBeds: wards.availableBeds
      });
    return updated;
  }

  static async deleteWard(facilityId: string, wardId: string) {
    const [deleted] = await db.update(wards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(wards.id, wardId), eq(wards.facilityId, facilityId)))
      .returning({ id: wards.id });
    return deleted;
  }

  // ── Activity Logs ──────────────────────────────────────────────────────────

  static async getActivityLogs(facilityId: string, limit = 100, offset = 0) {
    return await db.select({
      id: activityLogs.id, action: activityLogs.action, module: activityLogs.module,
      userId: activityLogs.userId, details: activityLogs.details, createdAt: activityLogs.createdAt
    }).from(activityLogs)
      .limit(limit).offset(offset).orderBy(desc(activityLogs.createdAt));
  }

  static async logActivity(facilityId: string, action: string, entityType: string, entityId: string, performedBy: string, details?: any) {
    await db.insert(activityLogs).values({
      userId: performedBy, module: entityType, action,
      details: details ? JSON.stringify(details) : null
    } as any);
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  static async getRoles(facilityId: string) {
    return await db.select({
      id: roles.id, name: roles.name, description: roles.description,
      permissions: roles.permissions, isSystem: roles.isSystem,
      isActive: roles.isActive, createdAt: roles.createdAt
    }).from(roles)
      .where(and(eq(roles.facilityId, facilityId), eq(roles.isActive, true)))
      .orderBy(roles.name);
  }

  static async createRole(facilityId: string, roleData: any) {
    const [newRole] = await db.insert(roles).values({
      facilityId, name: roleData.name, description: roleData.description,
      permissions: roleData.permissions || [], isSystem: false
    }).returning({
      id: roles.id, name: roles.name, description: roles.description,
      permissions: roles.permissions, isSystem: roles.isSystem, isActive: roles.isActive
    });
    return newRole;
  }

  static async updateRole(facilityId: string, roleId: string, updateData: any) {
    const [updatedRole] = await db.update(roles)
      .set({ name: updateData.name, description: updateData.description, permissions: updateData.permissions, updatedAt: new Date() })
      .where(and(eq(roles.id, roleId), eq(roles.facilityId, facilityId), eq(roles.isSystem, false)))
      .returning({
        id: roles.id, name: roles.name, description: roles.description,
        permissions: roles.permissions, isSystem: roles.isSystem, isActive: roles.isActive
      });
    return updatedRole;
  }

  static async deleteRole(facilityId: string, roleId: string) {
    const [deletedRole] = await db.update(roles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(roles.id, roleId), eq(roles.facilityId, facilityId), eq(roles.isSystem, false)))
      .returning({ id: roles.id });
    return deletedRole;
  }

  // Module configurations
  static async updateModuleConfig(facilityId: string, moduleName: string, enabled: boolean) {
    const [updated] = await db.update(moduleConfigurations)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(and(
        eq(moduleConfigurations.facilityId, facilityId),
        eq(moduleConfigurations.moduleName, moduleName)
      ))
      .returning({ id: moduleConfigurations.id, moduleName: moduleConfigurations.moduleName, isEnabled: moduleConfigurations.isEnabled });
    return updated;
  }

  // ── Facility Management ────────────────────────────────────────────────────

  static async getAllFacilities() {
    return await db.select({
      id: facilities.id, tenantId: facilities.tenantId, name: facilities.name,
      type: facilities.type, address: facilities.address, contactEmail: facilities.contactEmail,
      contactPhone: facilities.contactPhone, description: facilities.description,
      isActive: facilities.isActive, createdAt: facilities.createdAt
    }).from(facilities).where(eq(facilities.isActive, true)).orderBy(facilities.name);
  }

  static async createFacility(facilityData: any, performedBy?: string) {
    const [newFacility] = await db.insert(facilities).values({
      tenantId: facilityData.tenantId, name: facilityData.name, type: facilityData.type,
      address: facilityData.address, contactEmail: facilityData.contactEmail,
      contactPhone: facilityData.contactPhone, description: facilityData.description,
      mission: facilityData.mission, vision: facilityData.vision,
      services: facilityData.services, departments: facilityData.departments,
      operatingHours: facilityData.operatingHours, emergencyContact: facilityData.emergencyContact,
      website: facilityData.website
    }).returning({
      id: facilities.id, tenantId: facilities.tenantId, name: facilities.name,
      type: facilities.type, address: facilities.address, contactEmail: facilities.contactEmail,
      contactPhone: facilities.contactPhone, description: facilities.description,
      isActive: facilities.isActive, createdAt: facilities.createdAt
    });
    if (performedBy && newFacility.tenantId) {
      await this.logActivity(newFacility.tenantId, 'create', 'facility', newFacility.id, performedBy, { facilityName: newFacility.name });
    }
    return newFacility;
  }

  static async updateFacilityById(facilityId: string, updateData: any, performedBy?: string) {
    const [updatedFacility] = await db.update(facilities)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(facilities.id, facilityId))
      .returning({
        id: facilities.id, tenantId: facilities.tenantId, name: facilities.name,
        type: facilities.type, address: facilities.address, contactEmail: facilities.contactEmail,
        contactPhone: facilities.contactPhone, description: facilities.description, isActive: facilities.isActive
      });
    if (performedBy && updatedFacility?.tenantId) {
      await this.logActivity(updatedFacility.tenantId, 'update', 'facility', updatedFacility.id, performedBy, { changes: Object.keys(updateData) });
    }
    return updatedFacility;
  }

  static async deleteFacility(facilityId: string, performedBy?: string) {
    const [facilityInfo] = await db.select({ id: facilities.id, tenantId: facilities.tenantId, name: facilities.name })
      .from(facilities).where(eq(facilities.id, facilityId)).limit(1);
    const [deletedFacility] = await db.update(facilities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(facilities.id, facilityId))
      .returning({ id: facilities.id });
    if (performedBy && facilityInfo?.tenantId) {
      await this.logActivity(facilityInfo.tenantId, 'delete', 'facility', facilityId, performedBy, { facilityName: facilityInfo.name });
    }
    return deletedFacility;
  }
}
