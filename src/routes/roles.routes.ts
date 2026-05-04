import { Router } from 'express';
import { RolesController } from '../controllers/roles.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { roleSchema } from '../schemas/roles.schema';

const router = Router();
const rolesController = new RolesController();

router.use(authenticate);

router.post('/', validateRequest(roleSchema), rolesController.create);
router.get('/', rolesController.getAll);
router.get('/:id', rolesController.getById);
router.put('/:id', validateRequest(roleSchema), rolesController.update);
router.delete('/:id', rolesController.delete);
router.post('/:id/users', rolesController.assignUsers);
router.delete('/:id/users/:userId', rolesController.removeUser);

export default router;