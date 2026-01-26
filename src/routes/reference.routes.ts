import { Router } from 'express';
import * as referenceController from '../controllers/reference.controller';

const router = Router();

// Reference data routes (no authentication required for public data)
router.get('/counties', referenceController.getCounties);
router.get('/counties/:countyId/sub-counties', referenceController.getSubCounties);
router.get('/sub-counties/:subCountyId/wards', referenceController.getWards);
router.get('/document-types', referenceController.getDocumentTypes);
router.get('/application-statuses', referenceController.getApplicationStatuses);
router.get('/education-levels', referenceController.getEducationLevels);

export default router;
