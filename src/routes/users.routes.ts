import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { userSchema } from '../schemas/users.schema';
import { auditLogger } from '../middleware/audit-logger.middleware';
import { filterFields } from '../middleware/field-permissions.middleware';

const router = Router();
const usersController = new UsersController();

router.use(authenticate);

router.post('/', validateRequest(userSchema), auditLogger('CREATE_USER'), usersController.create);
router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.put('/:id', validateRequest(userSchema), usersController.update);
router.delete('/:id', usersController.delete);
router.post('/bulk', usersController.bulkCreate);
router.put('/bulk', usersController.bulkUpdate);
router.post('/:id/roles', usersController.assignRoles);
router.get('/:id/roles', usersController.getUserRoles);

export default router;