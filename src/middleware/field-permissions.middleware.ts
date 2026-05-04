import { Request, Response, NextFunction } from 'express';

interface FieldPermissions {
  [role: string]: {
    read: string[];
    write: string[];
  };
}

const fieldPermissions: FieldPermissions = {
  admin: { read: ['*'], write: ['*'] },
  doctor: { read: ['*'], write: ['diagnosis', 'treatment', 'notes'] },
  nurse: { read: ['vitals', 'medications'], write: ['vitals', 'medications'] },
  pharmacist: { read: ['prescriptions'], write: ['dispensations'] }
};

export const filterFields = (role: string, operation: 'read' | 'write') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = fieldPermissions[role] || { read: [], write: [] };
    const allowedFields = permissions[operation];
    
    if (allowedFields.includes('*')) return next();
    
    if (operation === 'write' && req.body) {
      req.body = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: req.body[key] }), {});
    }
    
    next();
  };
};