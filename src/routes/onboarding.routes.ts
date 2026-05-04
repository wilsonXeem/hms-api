import { Router } from 'express';
import {
  updateHospitalInfo,
  updateAboutContent,
  updateServices,
  updateLogo,
  updateSocialMedia,
  updateContactDetails,
  uploadLogo
} from '../controllers/onboarding.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { addTenantContext } from '../middleware/tenant.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { imageUploadMiddleware, optimizeImageMiddleware } from '../middleware/image-upload.middleware';

const router = Router();

// Apply middleware to all routes
router.use(addTenantContext);
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'super_admin']));

// Onboarding routes
router.put('/hospital-info', updateHospitalInfo);
router.put('/about-content', updateAboutContent);
router.put('/services', updateServices);
router.put('/logo', updateLogo);
router.put('/social-media', updateSocialMedia);
router.put('/contact-details', updateContactDetails);
router.post('/upload-logo', imageUploadMiddleware.single('logo'), optimizeImageMiddleware, uploadLogo);

export default router;