import { Request, Response } from 'express';
import { ModuleService } from '../services/module.service';
import { successResponse, errorResponse } from '../utils/response.util';

export class ModuleController {
  
  static async getEnabledModules(req: Request, res: Response) {
    try {
      const { facilityId } = req.params;
      const modules = await ModuleService.getEnabledModules(facilityId);
      return successResponse(res, 'Enabled modules retrieved', modules);
    } catch (error) {
      return errorResponse(res, 'Failed to get enabled modules', undefined, 500);
    }
  }

  static async enableModule(req: Request, res: Response) {
    try {
      const { facilityId, moduleName } = req.params;
      const { configuration } = req.body;
      
      await ModuleService.enableModule(facilityId, moduleName, configuration);
      return successResponse(res, 'Module enabled successfully');
    } catch (error) {
      return errorResponse(res, error.message, undefined, 400);
    }
  }

  static async disableModule(req: Request, res: Response) {
    try {
      const { facilityId, moduleName } = req.params;
      
      await ModuleService.disableModule(facilityId, moduleName);
      return successResponse(res, 'Module disabled successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to disable module', undefined, 500);
    }
  }
}