import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { moduleConfigurations, users } from '../drizzle/schema';

interface ModulePermission {
  module: string;
  action: string;
  resource?: string;
}

export class ModulePermissionsService {
  private static rolePermissions: Record<string, ModulePermission[]> = {
    admin: [
      { module: '*', action: '*' },
    ],
    doctor: [
      { module: 'patients', action: 'read' },
      { module: 'patients', action: 'write' },
      { module: 'lab', action: 'request' },
      { module: 'pharmacy', action: 'prescribe' },
      { module: 'appointments', action: 'manage' },
    ],
    nurse: [
      { module: 'patients', action: 'read' },
      { module: 'patients', action: 'update', resource: 'vitals' },
      { module: 'lab', action: 'collect' },
      { module: 'pharmacy', action: 'dispense' },
    ],
    pharmacist: [
      { module: 'pharmacy', action: '*' },
      { module: 'inventory', action: 'read' },
      { module: 'patients', action: 'read', resource: 'prescriptions' },
    ],
    lab_tech: [
      { module: 'lab', action: '*' },
      { module: 'patients', action: 'read', resource: 'lab_requests' },
    ],
  };

  static async hasPermission(userId: string, module: string, action: string, resource?: string): Promise<boolean> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return false;

    // Check if module is enabled for facility
    const [moduleConfig] = await db.select()
      .from(moduleConfigurations)
      .where(and(
        eq(moduleConfigurations.facilityId, user.facilityId),
        eq(moduleConfigurations.moduleName, module),
        eq(moduleConfigurations.isEnabled, true)
      ))
      .limit(1);

    if (!moduleConfig) return false;

    const permissions = this.rolePermissions[user.role] || [];
    
    return permissions.some(perm => 
      (perm.module === '*' || perm.module === module) &&
      (perm.action === '*' || perm.action === action) &&
      (!resource || !perm.resource || perm.resource === resource)
    );
  }

  static async getUserModulePermissions(userId: string): Promise<Record<string, string[]>> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return {};

    const enabledModules = await db.select()
      .from(moduleConfigurations)
      .where(and(
        eq(moduleConfigurations.facilityId, user.facilityId),
        eq(moduleConfigurations.isEnabled, true)
      ));

    const permissions = this.rolePermissions[user.role] || [];
    const result: Record<string, string[]> = {};

    enabledModules.forEach(mod => {
      const modulePerms = permissions
        .filter(p => p.module === '*' || p.module === mod.moduleName)
        .map(p => p.action);
      
      if (modulePerms.length > 0) {
        result[mod.moduleName] = [...new Set(modulePerms)];
      }
    });

    return result;
  }
}