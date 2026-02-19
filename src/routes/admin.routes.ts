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
    scoreApplicationSchema,
} from '../validators/admin.validator';
import {
    createPeriodSchema,
    updatePeriodSchema,
    getPeriodSchema,
    activatePeriodSchema,
} from '../validators/period.validator';

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

// ==================== APPLICATION SCORING ====================

router.post(
    '/applications/:id/scores',
    validate(scoreApplicationSchema),
    adminController.scoreApplication
);

router.get(
    '/applications/:id/scores',
    validate(getApplicationSchema),
    adminController.getApplicationScores
);

router.get(
    '/scoring-rubric',
    adminController.getScoringRubric
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

// ==================== APPLICATION PERIODS ====================

router.get(
    '/application-periods',
    adminController.getApplicationPeriods
);

router.post(
    '/application-periods',
    validate(createPeriodSchema),
    adminController.createApplicationPeriod
);

router.put(
    '/application-periods/:id',
    validate(updatePeriodSchema),
    adminController.updateApplicationPeriod
);

router.delete(
    '/application-periods/:id',
    validate(getPeriodSchema),
    adminController.deleteApplicationPeriod
);

router.put(
    '/application-periods/:id/activate',
    validate(activatePeriodSchema),
    adminController.activateApplicationPeriod
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

router.get(
    '/analytics/gender',
    adminController.getGenderAnalytics
);

router.get(
    '/analytics/funnel',
    adminController.getFunnelAnalytics
);

router.get(
    '/analytics/time-to-decision',
    adminController.getTimeToDecisionAnalytics
);

router.get(
    '/analytics/demographics',
    adminController.getDemographicsAnalytics
);

export default router;

