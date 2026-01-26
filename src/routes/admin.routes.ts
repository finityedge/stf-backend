import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import {
    listApplicationsSchema,
    updateApplicationStatusSchema,
    bulkUpdateSchema,
    getApplicationSchema,
    getStudentSchema,
    searchStudentsSchema,
    addNoteSchema,
    updateNoteSchema,
    deleteNoteSchema,
    exportApplicationsSchema,
    analyticsFilterSchema,
} from '../validators/admin.validator';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// ==================== APPLICATION MANAGEMENT ====================

router.get(
    '/applications',
    validate(listApplicationsSchema),
    adminController.listApplications
);

router.get(
    '/applications/export',
    validate(exportApplicationsSchema),
    adminController.exportApplications
);

router.post(
    '/applications/bulk-update',
    validate(bulkUpdateSchema),
    adminController.bulkUpdate
);

router.get(
    '/applications/:id',
    validate(getApplicationSchema),
    adminController.getApplication
);

router.put(
    '/applications/:id/status',
    validate(updateApplicationStatusSchema),
    adminController.updateApplicationStatus
);

// ==================== STUDENT MANAGEMENT ====================

router.get(
    '/search',
    validate(searchStudentsSchema),
    adminController.searchStudents
);

router.get(
    '/students/:profileId',
    validate(getStudentSchema),
    adminController.getStudentOverview
);

router.get(
    '/students/:profileId/applications',
    validate(getStudentSchema),
    adminController.getStudentApplications
);

router.get(
    '/students/:profileId/documents',
    validate(getStudentSchema),
    adminController.getStudentDocuments
);

router.get(
    '/students/:profileId/timeline',
    validate(getStudentSchema),
    adminController.getStudentTimeline
);

// ==================== NOTES MANAGEMENT ====================

router.post(
    '/notes',
    validate(addNoteSchema),
    adminController.addNote
);

// Note: Using :applicationId in params for consistency with REST but controller might expect noteId
// The schema expects applicationId in params for adding note, but noteId in params for update/delete
router.post(
    '/applications/:id/notes',
    validate(addNoteSchema),
    adminController.addNote
);

router.put(
    '/notes/:id',
    validate(updateNoteSchema),
    adminController.updateNote
);

router.delete(
    '/notes/:id',
    validate(deleteNoteSchema),
    adminController.deleteNote
);

// ==================== ANALYTICS ====================

router.get(
    '/analytics/summary',
    adminController.getAnalyticsSummary
);

router.get(
    '/analytics/by-county',
    validate(analyticsFilterSchema),
    adminController.getAnalyticsByCounty
);

router.get(
    '/analytics/by-institution',
    validate(analyticsFilterSchema),
    adminController.getAnalyticsByInstitution
);

router.get(
    '/analytics/disbursement',
    validate(analyticsFilterSchema),
    adminController.getDisbursementAnalytics
);

export default router;
