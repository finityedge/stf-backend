import { Request, Response } from 'express';
import adminService from '../services/admin.service';
import logger from '../config/logger';
import { ApplicationStatus } from '@prisma/client';

// ==================== APPLICATION MANAGEMENT ====================

/**
 * @swagger
 * /api/admin/applications:
 *   get:
 *     tags: [Admin]
 *     summary: List all applications with filtering
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: county
 *         schema:
 *           type: string
 *       - in: query
 *         name: institution
 *         schema:
 *           type: string
 *       - in: query
 *         name: educationLevel
 *         schema:
 *           type: string
 *       - in: query
 *         name: submittedAfter
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: submittedBefore
 *         schema:
 *           type: string
 *           format: date
 */
export const listApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await adminService.listApplications(req.query as any);

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('List applications error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to list applications',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/applications/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get application details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Application details
 */
export const getApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const application = await adminService.getApplication(id as string);

        res.status(200).json({
            success: true,
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get application details error:', error);
        res.status(404).json({
            success: false,
            error: {
                code: 'RESOURCE_NOT_FOUND',
                message: error.message || 'Application not found',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/applications/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update application status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const adminId = (req as any).user!.id;
        const { status, notes, disbursedAmount } = req.body;

        const updated = await adminService.updateApplicationStatus(
            id as string,
            adminId,
            status as ApplicationStatus,
            notes,
            disbursedAmount
        );

        logger.info(`Application ${id} status updated to ${status} by admin ${adminId}`);

        res.status(200).json({
            success: true,
            message: 'Application status updated successfully',
            data: updated,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Update application status error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: error.message.includes('Invalid status') ? 'INVALID_STATE_TRANSITION' : 'VALIDATION_ERROR',
                message: error.message || 'Failed to update status',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/applications/bulk-update:
 *   post:
 *     tags: [Admin]
 *     summary: Bulk update application status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateRequest'
 *     responses:
 *       200:
 *         description: Bulk update completed
 */
export const bulkUpdate = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        const result = await adminService.bulkUpdate(adminId, req.body);

        res.status(200).json({
            success: true,
            message: 'Bulk update completed',
            data: result,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to perform bulk update',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/applications/export:
 *   get:
 *     tags: [Admin]
 *     summary: Export applications to CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: submittedAfter
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: submittedBefore
 *         schema:
 *           type: string
 *           format: date
 */
export const exportApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await adminService.exportApplications(req.query as any);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
        res.send(result.csv);
    } catch (error: any) {
        logger.error('Export applications error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to export applications',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== STUDENT CONTEXT ====================

/**
 * @swagger
 * /api/admin/students/{profileId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get student context overview
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student overview
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 */
export const getStudentOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const { profileId } = req.params;
        const overview = await adminService.getStudentOverview(profileId as string);

        res.status(200).json({
            success: true,
            data: overview,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get student overview error:', error);
        res.status(404).json({
            success: false,
            error: {
                code: 'RESOURCE_NOT_FOUND',
                message: error.message || 'Student not found',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/students/{profileId}/applications:
 *   get:
 *     tags: [Admin]
 *     summary: Get all applications for a student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 */
export const getStudentApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { profileId } = req.params;
        const applications = await adminService.getStudentApplications(profileId as string);

        res.status(200).json({
            success: true,
            data: applications,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get student applications error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get applications',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/students/{profileId}/documents:
 *   get:
 *     tags: [Admin]
 *     summary: Get all documents for a student
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 */
export const getStudentDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { profileId } = req.params;
        const documents = await adminService.getStudentDocuments(profileId as string);

        res.status(200).json({
            success: true,
            data: documents,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get student documents error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get documents',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/students/{profileId}/timeline:
 *   get:
 *     tags: [Admin]
 *     summary: Get student timeline
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student timeline events
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 */
export const getStudentTimeline = async (req: Request, res: Response): Promise<void> => {
    try {
        const { profileId } = req.params;
        const timeline = await adminService.getStudentTimeline(profileId as string);

        res.status(200).json({
            success: true,
            data: timeline,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get student timeline error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get timeline',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== SEARCH ====================

/**
 * @swagger
 * /api/admin/search:
 *   get:
 *     tags: [Admin]
 *     summary: Search students
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
export const searchStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q, page, limit } = req.query;
        const result = await adminService.searchStudents(
            q as string,
            page ? Number(page) : 1,
            limit ? Number(limit) : 10
        );

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Search students error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to search students',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== NOTES ====================

/**
 * @swagger
 * /api/admin/notes:
 *   post:
 *     tags: [Admin]
 *     summary: Add admin note to an application
 *     description: Adds a structured review note to an application. Notes can be categorized by section.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - applicationId
 *               - noteText
 *             properties:
 *               applicationId:
 *                 type: string
 *                 format: uuid
 *                 description: The application to attach the note to
 *               noteText:
 *                 type: string
 *                 description: The note content
 *               isPrivate:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the note is visible only to admins
 *               section:
 *                 type: string
 *                 enum: [financial, academic, vulnerability, general]
 *                 description: Optional section category for structured reviews
 *     responses:
 *       201:
 *         description: Note added successfully
 *       400:
 *         description: Validation error
 */
export const addNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        // Route can be /notes (body has applicationId) or /applications/:id/notes (params has id)
        const applicationId = req.params.id || req.body.applicationId;
        const { noteText, isPrivate, section } = req.body;

        const note = await adminService.addNote(applicationId as string, adminId, noteText, isPrivate, section);

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: note,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Add note error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to add note',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/notes/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update note
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note updated
 */
export const updateNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        const noteId = req.params.id;
        const { noteText } = req.body;

        const note = await adminService.updateNote(noteId as string, adminId, noteText);

        res.status(200).json({
            success: true,
            message: 'Note updated successfully',
            data: note,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Update note error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to update note',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/notes/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete note
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted
 */
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        const noteId = req.params.id;

        await adminService.deleteNote(noteId as string, adminId);

        res.status(200).json({
            success: true,
            message: 'Note deleted successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Delete note error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to delete note',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== ANALYTICS ====================

/**
 * @swagger
 * /api/admin/analytics/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard summary KPIs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 */
export const getAnalyticsSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
        const summary = await adminService.getAnalyticsSummary();

        res.status(200).json({
            success: true,
            data: summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get analytics summary error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get analytics summary',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/analytics/by-county:
 *   get:
 *     tags: [Admin]
 *     summary: Get analytics by county
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: County analytics
 */
export const getAnalyticsByCounty = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getAnalyticsByCounty();

        res.status(200).json({
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get county analytics error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get county analytics',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/analytics/by-institution:
 *   get:
 *     tags: [Admin]
 *     summary: Get analytics by institution
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Institution analytics
 */
export const getAnalyticsByInstitution = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getAnalyticsByInstitution();

        res.status(200).json({
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get institution analytics error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get institution analytics',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/admin/analytics/disbursement:
 *   get:
 *     tags: [Admin]
 *     summary: Get disbursement analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disbursement analytics
 */
export const getDisbursementAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getDisbursementAnalytics();

        res.status(200).json({
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get disbursement analytics error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get disbursement analytics',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION PERIODS ====================

/**
 * @swagger
 * /api/admin/application-periods:
 *   get:
 *     tags: [Admin - Application Periods]
 *     summary: Get all application periods
 *     description: Returns all application periods, ordered by creation date descending.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of application periods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       academicYear:
 *                         type: string
 *                         example: "2025/26"
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       isActive:
 *                         type: boolean
 *                       description:
 *                         type: string
 *                         nullable: true
 */
export const getApplicationPeriods = async (_req: Request, res: Response): Promise<void> => {
    try {
        const periods = await adminService.getApplicationPeriods();
        res.status(200).json({ success: true, data: periods, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get application periods error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/application-periods:
 *   post:
 *     tags: [Admin - Application Periods]
 *     summary: Create a new application period
 *     description: Creates a new application period. Only one period can be active at a time.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - academicYear
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "2025/26 Bursary Application Window"
 *               academicYear:
 *                 type: string
 *                 pattern: "^\\d{4}/\\d{2}$"
 *                 example: "2025/26"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-15T00:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-31T23:59:59Z"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Application window for the 2025/26 academic year"
 *     responses:
 *       201:
 *         description: Application period created successfully
 *       400:
 *         description: Validation error (e.g. start date must be before end date)
 */
export const createApplicationPeriod = async (req: Request, res: Response): Promise<void> => {
    try {
        const period = await adminService.createApplicationPeriod(req.body);
        res.status(201).json({ success: true, message: 'Application period created', data: period, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Create application period error:', error);
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/application-periods/{id}:
 *   put:
 *     tags: [Admin - Application Periods]
 *     summary: Update an application period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application period ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application period updated
 *       404:
 *         description: Period not found
 */
export const updateApplicationPeriod = async (req: Request, res: Response): Promise<void> => {
    try {
        const period = await adminService.updateApplicationPeriod(req.params.id as string, req.body);
        res.status(200).json({ success: true, message: 'Application period updated', data: period, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Update application period error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/application-periods/{id}:
 *   delete:
 *     tags: [Admin - Application Periods]
 *     summary: Delete an application period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application period ID
 *     responses:
 *       200:
 *         description: Application period deleted
 *       404:
 *         description: Period not found
 */
export const deleteApplicationPeriod = async (req: Request, res: Response): Promise<void> => {
    try {
        await adminService.deleteApplicationPeriod(req.params.id as string);
        res.status(200).json({ success: true, message: 'Application period deleted', timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Delete application period error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/application-periods/{id}/activate:
 *   put:
 *     tags: [Admin - Application Periods]
 *     summary: Activate an application period
 *     description: Activates this period and deactivates all other periods. The active period controls the /api/config/current response.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application period ID to activate
 *     responses:
 *       200:
 *         description: Application period activated, all others deactivated
 *       404:
 *         description: Period not found
 */
export const activateApplicationPeriod = async (req: Request, res: Response): Promise<void> => {
    try {
        const period = await adminService.activateApplicationPeriod(req.params.id as string);
        res.status(200).json({ success: true, message: 'Application period activated', data: period, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Activate application period error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

// ==================== SCORING ====================

/**
 * @swagger
 * /api/admin/applications/{id}/scores:
 *   post:
 *     tags: [Admin - Scoring]
 *     summary: Score an application
 *     description: Submit or update a review score for an application. Each reviewer can only submit one score per application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - financialNeed
 *               - academicMerit
 *               - communityImpact
 *               - vulnerability
 *             properties:
 *               financialNeed:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Financial need score (1-5)
 *               academicMerit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Academic merit score (1-5)
 *               communityImpact:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Community impact score (1-5)
 *               vulnerability:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Vulnerability score (1-5)
 *               comments:
 *                 type: string
 *                 description: Optional reviewer comments
 *     responses:
 *       201:
 *         description: Score submitted successfully
 *       404:
 *         description: Application not found
 *       400:
 *         description: Validation error
 */
export const scoreApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        const score = await adminService.scoreApplication(req.params.id as string, adminId, req.body);
        res.status(201).json({ success: true, message: 'Score submitted', data: score, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Score application error:', error);
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ success: false, error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'VALIDATION_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/applications/{id}/scores:
 *   get:
 *     tags: [Admin - Scoring]
 *     summary: Get all review scores for an application
 *     description: Returns all review scores and the computed average for the given application.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application scores with average
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     scores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           financialNeed:
 *                             type: integer
 *                           academicMerit:
 *                             type: integer
 *                           communityImpact:
 *                             type: integer
 *                           vulnerability:
 *                             type: integer
 *                           overallScore:
 *                             type: number
 *                           comments:
 *                             type: string
 *                             nullable: true
 *                     averageScore:
 *                       type: number
 *                       nullable: true
 */
export const getApplicationScores = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await adminService.getApplicationScores(req.params.id as string);
        res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get application scores error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/scoring-rubric:
 *   get:
 *     tags: [Admin - Scoring]
 *     summary: Get the scoring rubric criteria definitions
 *     description: Returns the scoring rubric with criteria names, descriptions, and the min/max scale.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scoring rubric criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     criteria:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           minScore:
 *                             type: integer
 *                           maxScore:
 *                             type: integer
 */
export const getScoringRubric = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rubric = adminService.getScoringRubric();
        res.status(200).json({ success: true, data: rubric, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get scoring rubric error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

// ==================== ENHANCED ANALYTICS ====================

/**
 * @swagger
 * /api/admin/analytics/gender:
 *   get:
 *     tags: [Admin - Analytics]
 *     summary: Get gender breakdown analytics
 *     description: Returns application count and approval rates grouped by gender.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gender breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       gender:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       approved:
 *                         type: integer
 *                       rejected:
 *                         type: integer
 */
export const getGenderAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getGenderAnalytics();
        res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get gender analytics error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/analytics/funnel:
 *   get:
 *     tags: [Admin - Analytics]
 *     summary: Get application funnel analytics
 *     description: Returns the count of applications at each stage of the review pipeline (draft, submitted, under review, approved, rejected, disbursed).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Funnel stage counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       count:
 *                         type: integer
 */
export const getFunnelAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getFunnelAnalytics();
        res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get funnel analytics error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/analytics/time-to-decision:
 *   get:
 *     tags: [Admin - Analytics]
 *     summary: Get time-to-decision analytics
 *     description: Returns average, min, and max time (in days) between application submission and final decision.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time-to-decision statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     averageDays:
 *                       type: number
 *                     minDays:
 *                       type: number
 *                     maxDays:
 *                       type: number
 *                     totalDecided:
 *                       type: integer
 */
export const getTimeToDecisionAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getTimeToDecisionAnalytics();
        res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get time-to-decision analytics error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};

/**
 * @swagger
 * /api/admin/analytics/demographics:
 *   get:
 *     tags: [Admin - Analytics]
 *     summary: Get demographics overview
 *     description: Returns demographic breakdowns including county distribution, education level, orphan status, and household income ranges.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Demographic breakdowns
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     byCounty:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byEducationLevel:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byOrphanStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                     byIncomeRange:
 *                       type: array
 *                       items:
 *                         type: object
 */
export const getDemographicsAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await adminService.getDemographicsAnalytics();
        res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Get demographics analytics error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message }, timestamp: new Date().toISOString() });
    }
};
