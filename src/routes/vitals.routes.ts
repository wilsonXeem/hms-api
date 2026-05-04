import { Router } from 'express';
import { VitalsController } from '../controllers/vitals.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { vitalsSchema } from '../schemas/vitals.schema';

const router = Router();
const vitalsController = new VitalsController();

router.use(authenticate);

router.post('/', validateRequest(vitalsSchema), vitalsController.create);
router.get('/patient/:patientId', vitalsController.getByPatient);
router.get('/:id', vitalsController.getById);
router.put('/:id', validateRequest(vitalsSchema), vitalsController.update);
router.delete('/:id', vitalsController.delete);
router.post('/bulk', vitalsController.bulkCreate);

export default router;