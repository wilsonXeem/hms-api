import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { moduleConfigurations, moduleCatalog, facilities, tenants } from '../drizzle/schema';

export class ModuleService {
  static async getEnabledModules(facilityId: string): Promise<string[]> {
    const modules = await db.select()
      .from(moduleConfigurations)
      .where(and(
        eq(moduleConfigurations.facilityId, facilityId),
        eq(moduleConfigurations.isEnabled, true)
      ));
    
    return modules.map(m => m.moduleName);
  }
  
  static async enableModule(facilityId: string, moduleName: string, config?: any): Promise<void> {
    // Check if module exists in catalog
    const [module] = await db.select()
      .from(moduleCatalog)
      .where(eq(moduleCatalog.name, moduleName))
      .limit(1);
    
    if (!module) {
      throw new Error(`Module '${moduleName}' not found in catalog`);
    }
    
    // Check dependencies
    if (module.dependencies) {
      const dependencies = JSON.parse(module.dependencies);
      const enabledModules = await this.getEnabledModules(facilityId);
      
      for (const dep of dependencies) {
        if (!enabledModules.includes(dep)) {
          throw new Error(`Module '${moduleName}' requires '${dep}' to be enabled first`);
        }
      }
    }
    
    // Enable module
    await db.insert(moduleConfigurations).values({
      facilityId,
      moduleName,
      isEnabled: true,
      configuration: config ? JSON.stringify(config) : null,
    }).onConflictDoUpdate({
      target: [moduleConfigurations.facilityId, moduleConfigurations.moduleName],
      set: {
        isEnabled: true,
        configuration: config ? JSON.stringify(config) : null,
        updatedAt: new Date(),
      }
    });
  }
  
  static async disableModule(facilityId: string, moduleName: string): Promise<void> {
    await db.update(moduleConfigurations)
      .set({ isEnabled: false, updatedAt: new Date() })
      .where(and(
        eq(moduleConfigurations.facilityId, facilityId),
        eq(moduleConfigurations.moduleName, moduleName)
      ));
  }
  
  static async getAvailableModules(tenantId: string): Promise<any[]> {
    // Get tenant's allowed modules
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (!tenant) return [];
    
    const allowedModules = tenant.allowedModules ? 
      JSON.parse(tenant.allowedModules) : [];
    
    // Get module details from catalog
    const modules = await db.select()
      .from(moduleCatalog)
      .where(eq(moduleCatalog.isActive, true));
    
    return modules.filter(m => allowedModules.includes(m.name));
  }
}