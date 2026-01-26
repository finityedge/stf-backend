import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate } from '../middleware/auth';
import { requireStudent } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { upload } from '../config/upload';
import {
    createProfileSchema,
    updateProfileSchema,
    uploadProfileDocumentSchema,
    deleteProfileDocumentSchema,
    createDraftSchema,
    updateDraftSchema,
    uploadApplicationDocumentSchema,
    linkProfileDocumentSchema,
    submitApplicationSchema,
} from '../validators/student.validator';

const router = Router();

// All student routes require authentication and student role
router.use(authenticate, requireStudent);

// ==================== PROFILE ROUTES ====================

router.get('/profile', studentController.getProfile);
router.post('/profile', validate(createProfileSchema), studentController.createProfile);
router.put('/profile', validate(updateProfileSchema), studentController.updateProfile);
router.get('/profile/completeness', studentController.getProfileCompleteness);

// Profile Documents
router.post(
    '/profile/documents',
    upload.single('file'),
    validate(uploadProfileDocumentSchema),
    studentController.uploadProfileDocument
);
router.get('/profile/documents', studentController.getProfileDocuments);
router.delete(
    '/profile/documents/:id',
    validate(deleteProfileDocumentSchema),
    studentController.deleteProfileDocument
);

// ==================== APPLICATION ROUTES ====================

// Application Lifecycle
router.get('/applications/eligibility', studentController.checkEligibility);
router.get('/applications/active', studentController.getActiveApplication);
router.get('/applications', studentController.getApplications);

// Draft Management
router.post(
    '/applications/draft',
    validate(createDraftSchema),
    studentController.createDraft
);
router.put(
    '/applications/:id',
    validate(updateDraftSchema),
    studentController.updateDraft
);

// Application Documents
router.post(
    '/applications/:id/documents',
    upload.single('file'),
    validate(uploadApplicationDocumentSchema),
    studentController.uploadApplicationDocument
);
router.get('/applications/:id/documents', studentController.getApplicationDocuments);
router.post(
    '/applications/:id/link-profile-document',
    validate(linkProfileDocumentSchema),
    studentController.linkProfileDocument
);

// Submission
router.post(
    '/applications/:id/submit',
    validate(submitApplicationSchema),
    studentController.submitApplication
);

// History & Details
router.get('/applications/:id', studentController.getApplication);
router.get('/applications/:id/history', studentController.getApplicationHistory);

export default router;
