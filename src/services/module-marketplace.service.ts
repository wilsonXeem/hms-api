import { eq, and } from 'drizzle-orm';
import { db } from '../config/db.config';
import { tenants, moduleConfigurations, tenantSubscriptions } from '../drizzle/schema';

interface ModuleUpgrade {
  tenantId: string;
  moduleName: string;
  fromPlan: string;
  toPlan: string;
}

export class ModuleMarketplaceService {
  private static modulePackages: Record<string, { modules: string[], price: number }> = {
    BASIC: { modules: ['patients', 'appointments'], price: 50 },
    CLINIC_ESSENTIAL: { modules: ['patients', 'doctors', 'appointments', 'billing'], price: 150 },
    PHARMACY_PRO: { modules: ['pharmacy', 'inventory', 'patients', 'billing'], price: 200 },
    HOSPITAL_COMPLETE: { modules: ['patients', 'doctors', 'pharmacy', 'lab', 'inventory', 'billing', 'reports'], price: 500 },
    WAREHOUSE_MANAGER: { modules: ['inventory', 'suppliers', 'logistics', 'reports'], price: 300 },
  };

  static async upgradeModule(upgrade: ModuleUpgrade): Promise<void> {
    const fromPackage = this.modulePackages[upgrade.fromPlan];
    const toPackage = this.modulePackages[upgrade.toPlan];

    if (!fromPackage || !toPackage) {
      throw new Error('Invalid package plan');
    }

    if (toPackage.price <= fromPackage.price) {
      throw new Error('Cannot downgrade to a lower-priced plan');
    }

    await db.transaction(async (tx) => {
      // Update tenant subscription
      await tx.update(tenants)
        .set({ 
          subscriptionPlan: upgrade.toPlan,
          allowedModules: JSON.stringify(toPackage.modules),
          updatedAt: new Date()
        })
        .where(eq(tenants.id, upgrade.tenantId));

      // Record subscription change
      await tx.insert(tenantSubscriptions).values({
        tenantId: upgrade.tenantId,
        planName: upgrade.toPlan,
        subscriptionType: 'yearly',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        billingAmount: toPackage.price.toString(),
      });
    });
  }

  static async getAvailableUpgrades(tenantId: string): Promise<any[]> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) return [];

    const currentPlan = tenant.subscriptionPlan;
    const currentPrice = this.modulePackages[currentPlan]?.price || 0;

    return Object.entries(this.modulePackages)
      .filter(([plan, details]) => details.price > currentPrice)
      .map(([plan, details]) => ({
        plan,
        modules: details.modules,
        price: details.price,
        upgrade_cost: details.price - currentPrice,
      }));
  }

  static async addIndividualModule(tenantId: string, moduleName: string): Promise<void> {
    const modulePrice = 25;

    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new Error('Tenant not found');

    const allowedModules = tenant.allowedModules ? JSON.parse(tenant.allowedModules) : [];
    
    if (allowedModules.includes(moduleName)) {
      throw new Error('Module already available');
    }

    allowedModules.push(moduleName);

    await db.transaction(async (tx) => {
      await tx.update(tenants)
        .set({ 
          allowedModules: JSON.stringify(allowedModules),
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      await tx.insert(tenantSubscriptions).values({
        tenantId,
        planName: `ADDON_${moduleName.toUpperCase()}`,
        subscriptionType: 'yearly',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingAmount: modulePrice.toString(),
      });
    });
  }

  static async removeModule(tenantId: string, moduleName: string): Promise<void> {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) throw new Error('Tenant not found');

    const allowedModules = tenant.allowedModules ? JSON.parse(tenant.allowedModules) : [];
    const updatedModules = allowedModules.filter((m: string) => m !== moduleName);

    await db.update(tenants)
      .set({ 
        allowedModules: JSON.stringify(updatedModules),
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));
  }
}
