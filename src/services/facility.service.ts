import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { facilities, moduleConfigurations, users } from '../drizzle/schema';

export const getFacilityById = async (facilityId: string) => {
  const [facility] = await db.select().from(facilities).where(eq(facilities.id, facilityId)).limit(1);
  return facility;
};

export const getFacilityModules = async (facilityId: string) => {
  return await db.select().from(moduleConfigurations)
    .where(eq(moduleConfigurations.facilityId, facilityId));
};

export const enableModule = async (facilityId: string, moduleName: string, configuration?: any) => {
  const existing = await db.select().from(moduleConfigurations)
    .where(and(
      eq(moduleConfigurations.facilityId, facilityId),
      eq(moduleConfigurations.moduleName, moduleName)
    )).limit(1);

  if (existing.length > 0) {
    return await db.update(moduleConfigurations)
      .set({ 
        isEnabled: true, 
        configuration: configuration ? JSON.stringify(configuration) : null,
        updatedAt: new Date()
      })
      .where(eq(moduleConfigurations.id, existing[0].id))
      .returning();
  } else {
    return await db.insert(moduleConfigurations).values({
      facilityId,
      moduleName,
      isEnabled: true,
      configuration: configuration ? JSON.stringify(configuration) : null
    }).returning();
  }
};

export const disableModule = async (facilityId: string, moduleName: string) => {
  return await db.update(moduleConfigurations)
    .set({ isEnabled: false, updatedAt: new Date() })
    .where(and(
      eq(moduleConfigurations.facilityId, facilityId),
      eq(moduleConfigurations.moduleName, moduleName)
    ))
    .returning();
};

export const getFacilityUsers = async (facilityId: string) => {
  return await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role,
    department: users.department,
    isActive: users.isActive
  }).from(users).where(eq(users.facilityId, facilityId));
};