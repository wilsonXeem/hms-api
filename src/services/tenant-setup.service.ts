import { db } from '../config/database';
import { tenants, users, facilities } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export class TenantSetupService {
  async createTenant(data: any) {
    return await db.insert(tenants).values(data).returning();
  }

  async setupTenantDatabase(tenantId: string) {
    // Initialize tenant-specific configurations
    return { success: true, tenantId };
  }

  async createTenantAdmin(tenantId: string, adminData: any) {
    return await db.insert(users).values({
      ...adminData,
      tenantId,
      role: 'admin'
    }).returning();
  }

  async setupTenantFacilities(tenantId: string, facilitiesData: any[]) {
    return await db.insert(facilities).values(
      facilitiesData.map(facility => ({ ...facility, tenantId }))
    ).returning();
  }

  async getTenantSetupStatus(tenantId: string) {
    const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    return tenant[0] || null;
  }

  async completeTenantSetup(tenantId: string) {
    return await db.update(tenants)
      .set({ setupCompleted: true, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
  }
}

export const tenantSetupService = new TenantSetupService();