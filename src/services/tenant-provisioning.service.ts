import { db } from "../config/db.config";
import {
  tenants,
  facilities,
  users,
  moduleConfigurations,
  tenantSubscriptions,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { DockerOrchestrationService } from "./docker-orchestration.service";

interface TenantSetupData {
  organizationName: string;
  organizationType:
    | "hospital"
    | "clinic"
    | "pharmacy"
    | "warehouse"
    | "diagnostic_center";
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  selectedModules: string[];
  subscriptionPlan: string;
  customDomain?: string;
}

export class TenantProvisioningService {
  static async createTenant(setupData: TenantSetupData) {
    return await db.transaction(async (tx) => {
      // 1. Create tenant
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: setupData.organizationName,
          organizationType: setupData.organizationType,
          subdomain: setupData.subdomain,
          customDomain: setupData.customDomain,
          subscriptionPlan: setupData.subscriptionPlan,
          allowedModules: JSON.stringify(setupData.selectedModules),
          billingEmail: setupData.adminEmail,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        })
        .returning();

      // 2. Create main facility
      const [facility] = await tx
        .insert(facilities)
        .values({
          tenantId: tenant.id,
          name: setupData.organizationName,
          type: setupData.organizationType,
        })
        .returning();

      // 3. Create admin user
      const hashedPassword = await bcrypt.hash(setupData.adminPassword, 10);
      const [adminUser] = await tx
        .insert(users)
        .values({
          facilityId: facility.id,
          firstName: "Admin",
          lastName: "User",
          email: setupData.adminEmail,
          passwordHash: hashedPassword,
          role: "admin",
        })
        .returning();

      // 4. Configure modules for facility
      const moduleConfigs = setupData.selectedModules.map((moduleName) => ({
        facilityId: facility.id,
        moduleName,
        isEnabled: true,
        configuration: JSON.stringify(
          this.getDefaultModuleConfig(moduleName, setupData.organizationType)
        ),
      }));

      await tx.insert(moduleConfigurations).values(moduleConfigs);

      // 5. Provision infrastructure
      await DockerOrchestrationService.provisionTenantInfrastructure({
        subdomain: setupData.subdomain,
        tenantId: tenant.id,
        dbName: `${setupData.subdomain.replace('-', '_')}_db`
      });

      return { tenant, facility, adminUser };
    });
  }

  private static getDefaultModuleConfig(moduleName: string, orgType: string) {
    const configs: any = {
      pharmacy: {
        allowDispensing: orgType === "pharmacy" || orgType === "hospital",
        requirePrescription: true,
        stockAlertThreshold: 10,
      },
      inventory: {
        trackExpiry: true,
        autoReorder: orgType === "warehouse",
        batchTracking: true,
      },
      lab: {
        allowResultUpload:
          orgType === "diagnostic_center" || orgType === "hospital",
        requireApproval: true,
      },
      patients: {
        allowRegistration: orgType !== "warehouse",
        requireInsurance: orgType === "hospital",
      },
    };

    return configs[moduleName] || {};
  }

  static async getAvailableModulesForOrgType(orgType: string) {
    const modulesByType: any = {
      hospital: [
        "patients",
        "doctors",
        "pharmacy",
        "lab",
        "inventory",
        "billing",
        "reports",
        "appointments",
      ],
      clinic: ["patients", "doctors", "pharmacy", "billing", "appointments"],
      pharmacy: ["pharmacy", "inventory", "patients", "billing", "suppliers"],
      warehouse: ["inventory", "suppliers", "logistics", "reports"],
      diagnostic_center: [
        "patients",
        "lab",
        "billing",
        "reports",
        "appointments",
      ],
    };

    return modulesByType[orgType] || [];
  }

  static getModulePackagesForOrgType(orgType: string) {
    const packagesByType: any = {
      hospital: ["HOSPITAL_COMPLETE", "CLINIC_ESSENTIAL"],
      clinic: ["CLINIC_ESSENTIAL"],
      pharmacy: ["PHARMACY_PRO"],
      warehouse: ["WAREHOUSE_MANAGER"],
      diagnostic_center: ["CLINIC_ESSENTIAL"],
    };

    return packagesByType[orgType] || [];
  }
}
