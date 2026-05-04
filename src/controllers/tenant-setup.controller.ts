import { Request, Response } from 'express';
import { TenantProvisioningService } from '../services/tenant-provisioning.service';
import { successResponse, errorResponse } from '../utils/response.util';
import { db } from '../config/db.config';
import { moduleCatalog, tenants, modulePackages } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { PREDEFINED_PACKAGES } from '../models/module-packages.model';

export class TenantSetupController {
  
  static async checkSubdomainAvailability(req: Request, res: Response) {
    try {
      const { subdomain } = req.params;
      
      if (!subdomain) {
        return errorResponse(res, 'Subdomain is required', undefined, 400);
      }

      // Check if subdomain already exists
      const existingTenant = await db.select()
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);

      const isAvailable = existingTenant.length === 0;
      
      return successResponse(res, 'Subdomain availability checked', {
        subdomain,
        available: isAvailable,
        message: isAvailable ? 'Subdomain is available' : 'Subdomain is already taken'
      });
    } catch (error) {
      return errorResponse(res, 'Failed to check subdomain availability', undefined, 500);
    }
  }

  static async getPackagesByOrgType(req: Request, res: Response) {
    try {
      const { orgType } = req.params;
      
      if (!orgType) {
        return errorResponse(res, 'Organization type is required', undefined, 400);
      }

      // Get predefined packages for organization type
      const availablePackageKeys = TenantProvisioningService.getModulePackagesForOrgType(orgType);
      const packages = availablePackageKeys.map(key => ({
        id: key,
        ...PREDEFINED_PACKAGES[key]
      }));

      return successResponse(res, 'Packages retrieved successfully', packages);
    } catch (error) {
      return errorResponse(res, 'Failed to get packages', undefined, 500);
    }
  }

  static async getAvailableModules(req: Request, res: Response) {
    try {
      const { orgType } = req.query;
      
      if (!orgType) {
        return errorResponse(res, 'Organization type is required', undefined, 400);
      }

      // Get modules compatible with organization type
      const modules = await db.select()
        .from(moduleCatalog)
        .where(and(
          eq(moduleCatalog.isActive, true),
        ));

      // Filter by organization compatibility
      const compatibleModules = modules.filter(module => {
        if (!module.compatibleOrgTypes) return true;
        const compatibleTypes = JSON.parse(module.compatibleOrgTypes);
        return compatibleTypes.includes(orgType);
      });

      return successResponse(res, 'Available modules retrieved', compatibleModules);
    } catch (error) {
      return errorResponse(res, 'Failed to get available modules', undefined, 500);
    }
  }

  static async setupTenant(req: Request, res: Response) {
    try {
      const {
        organizationName,
        organizationType,
        subdomain,
        adminEmail,
        adminPassword,
        selectedModules,
        subscriptionPlan,
        customDomain
      } = req.body;

      // Validate required fields
      if (!organizationName || !organizationType || !subdomain || !adminEmail || !adminPassword) {
        return errorResponse(res, 'Missing required fields', undefined, 400);
      }

      // Validate organization type
      const validOrgTypes = ['hospital', 'clinic', 'pharmacy', 'warehouse', 'diagnostic_center'];
      if (!validOrgTypes.includes(organizationType)) {
        return errorResponse(res, 'Invalid organization type', undefined, 400);
      }

      // Get available modules for this org type
      const availableModules = await TenantProvisioningService.getAvailableModulesForOrgType(organizationType);
      
      // Validate selected modules
      const invalidModules = selectedModules.filter(module => !availableModules.includes(module));
      if (invalidModules.length > 0) {
        return errorResponse(res, `Invalid modules for ${organizationType}: ${invalidModules.join(', ')}`, undefined, 400);
      }

      const result = await TenantProvisioningService.createTenant({
        organizationName,
        organizationType,
        subdomain,
        adminEmail,
        adminPassword,
        selectedModules: selectedModules || availableModules,
        subscriptionPlan: subscriptionPlan || 'trial',
        customDomain
      });

      return successResponse(res, 'Tenant created successfully', {
        tenantId: result.tenant.id,
        facilityId: result.facility.id,
        adminUserId: result.adminUser.id,
        subdomain: result.tenant.subdomain,
        trialEndsAt: result.tenant.trialEndsAt
      });

    } catch (error) {
      console.error('Tenant setup error:', error);
      return errorResponse(res, 'Failed to setup tenant', undefined, 500);
    }
  }

  static async getOrganizationTypes(req: Request, res: Response) {
    try {
      const orgTypes = [
        {
          value: 'hospital',
          label: 'Hospital',
          description: 'Full-service medical facility with multiple departments',
          defaultModules: ['patients', 'doctors', 'pharmacy', 'lab', 'inventory', 'billing']
        },
        {
          value: 'clinic',
          label: 'Clinic',
          description: 'Outpatient medical facility',
          defaultModules: ['patients', 'doctors', 'pharmacy', 'billing']
        },
        {
          value: 'pharmacy',
          label: 'Pharmacy',
          description: 'Medication dispensing facility',
          defaultModules: ['pharmacy', 'inventory', 'patients', 'billing']
        },
        {
          value: 'warehouse',
          label: 'Medical Warehouse',
          description: 'Medical supply storage and distribution',
          defaultModules: ['inventory', 'suppliers', 'logistics']
        },
        {
          value: 'diagnostic_center',
          label: 'Diagnostic Center',
          description: 'Laboratory and imaging services',
          defaultModules: ['patients', 'lab', 'billing', 'reports']
        }
      ];

      return successResponse(res, 'Organization types retrieved', orgTypes);
    } catch (error) {
      return errorResponse(res, 'Failed to get organization types', undefined, 500);
    }
  }
}