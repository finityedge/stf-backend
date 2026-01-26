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
 *     responses:
 *       200:
 *         description: Search results
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
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
 *     summary: Add admin note
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
 *               - content
 *             properties:
 *               applicationId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note added successfully
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         description: Optional ID if adding via /applications/:id/notes
 *         schema:
 *           type: string
 */
export const addNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const adminId = (req as any).user!.id;
        // Route can be /notes (body has applicationId) or /applications/:id/notes (params has id)
        const applicationId = req.params.id || req.body.applicationId;
        const { noteText, isPrivate } = req.body;

        const note = await adminService.addNote(applicationId as string, adminId, noteText, isPrivate);

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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
