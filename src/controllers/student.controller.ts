import { Request, Response } from 'express';
import studentService from '../services/student.service';
import { ProfileDocumentType, ApplicationDocumentType } from '@prisma/client';
import logger from '../config/logger';
import { validateFileUpload } from '../utils/validators';

// ==================== PROFILE ====================

/**
 * @swagger
 * /api/student/profile:
 *   get:
 *     tags: [Student]
 *     summary: Get student profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved successfully
 *       404:
 *         description: Profile not found
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const profile = await studentService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: profile,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get profile',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/profile:
 *   post:
 *     tags: [Student]
 *     summary: Create student profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProfileRequest'
 *     responses:
 *       201:
 *         description: Profile created successfully
 */
export const createProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const data = {
            ...req.body,
            dateOfBirth: new Date(req.body.dateOfBirth),
        };
        const profile = await studentService.createProfile(userId, data);

        logger.info('Profile created', { userId, profileId: profile.id });

        res.status(201).json({
            success: true,
            message: 'Profile created successfully',
            data: profile,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Create profile error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: error.message.includes('already') ? 'DUPLICATE_RESOURCE' : 'VALIDATION_ERROR',
                message: error.message || 'Failed to create profile',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/profile:
 *   put:
 *     tags: [Student]
 *     summary: Update student profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const data = {
            ...req.body,
            dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        };
        const profile = await studentService.updateProfile(userId, data);

        logger.info('Profile updated', { userId, profileId: profile.id });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Update profile error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to update profile',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/profile/completeness:
 *   get:
 *     tags: [Student]
 *     summary: Check profile completeness
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completeness details
 */
export const getProfileCompleteness = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const completeness = await studentService.getProfileCompleteness(userId);

        res.status(200).json({
            success: true,
            data: completeness,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get profile completeness error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to check profile completeness',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== PROFILE DOCUMENTS ====================

/**
 * @swagger
 * /api/student/profile/documents:
 *   post:
 *     tags: [Student]
 *     summary: Upload profile document
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [NATIONAL_ID, PASSPORT, KCSE_CERT, ADMISSION_LETTER, STUDENT_ID, TRANSCRIPT]
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
export const uploadProfileDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const file = (req as any).file;
        const { documentType } = req.body;

        if (!file) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_UPLOAD_FAILED',
                    message: 'No file uploaded',
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // Validate file
        const validation = validateFileUpload(file);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_UPLOAD_FAILED',
                    message: validation.error,
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const document = await studentService.uploadProfileDocument(
            userId,
            documentType as ProfileDocumentType,
            {
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Upload profile document error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'FILE_UPLOAD_FAILED',
                message: error.message || 'Failed to upload document',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/profile/documents:
 *   get:
 *     tags: [Student]
 *     summary: List profile documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of profile documents
 */
export const getProfileDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const documents = await studentService.getProfileDocuments(userId);

        res.status(200).json({
            success: true,
            data: documents,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get profile documents error:', error);
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
 * /api/student/profile/documents/{id}:
 *   delete:
 *     tags: [Student]
 *     summary: Delete profile document
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
 *         description: Document deleted successfully
 */
export const deleteProfileDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        await studentService.deleteProfileDocument(userId, id as string);

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Delete profile document error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to delete document',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION ELIGIBILITY ====================

/**
 * @swagger
 * /api/student/applications/eligibility:
 *   get:
 *     tags: [Student]
 *     summary: Check application eligibility
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility status
 */
export const checkEligibility = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const valid = await studentService.checkEligibility(userId);

        res.status(200).json({
            success: true,
            data: valid,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Check eligibility error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to check eligibility',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/applications/active:
 *   get:
 *     tags: [Student]
 *     summary: Get active application
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active application or null
 */
export const getActiveApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const application = await studentService.getActiveApplication(userId);

        res.status(200).json({
            success: true,
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get active application error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to get active application',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION DRAFT ====================

/**
 * @swagger
 * /api/student/applications/draft:
 *   post:
 *     tags: [Student]
 *     summary: Create draft application
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDraftRequest'
 *     responses:
 *       201:
 *         description: Draft created successfully
 */
export const createDraft = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const application = await studentService.createDraft(userId, req.body);

        logger.info('Draft application created', { userId, applicationId: application.id });

        res.status(201).json({
            success: true,
            message: 'Draft application created successfully',
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Create draft error:', error);
        const statusCode = error.message.includes('eligible') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            error: {
                code: error.message.includes('eligible') ? 'APPLICATION_NOT_ELIGIBLE' : 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to create draft',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/applications/{id}:
 *   put:
 *     tags: [Student]
 *     summary: Update draft application
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
 *             $ref: '#/components/schemas/UpdateDraftRequest'
 *     responses:
 *       200:
 *         description: Draft updated successfully
 */
export const updateDraft = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const application = await studentService.updateDraft(userId, id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Draft updated successfully',
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Update draft error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: error.message.includes('Only draft') ? 'INVALID_STATE_TRANSITION' : 'VALIDATION_ERROR',
                message: error.message || 'Failed to update draft',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION DOCUMENTS ====================

/**
 * @swagger
 * /api/student/applications/{id}/documents:
 *   post:
 *     tags: [Student]
 *     summary: Upload application document
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [FEE_STRUCTURE, BALANCE_STATEMENT, SUPPORT_LETTER, OTHER_EVIDENCE]
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
export const uploadApplicationDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const file = (req as any).file;
        const { documentType } = req.body;

        if (!file) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_UPLOAD_FAILED',
                    message: 'No file uploaded',
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const validation = validateFileUpload(file);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'FILE_UPLOAD_FAILED',
                    message: validation.error,
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const document = await studentService.uploadApplicationDocument(
            userId,
            id as string,
            documentType as ApplicationDocumentType,
            {
                originalname: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Upload application document error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'FILE_UPLOAD_FAILED',
                message: error.message || 'Failed to upload document',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

/**
 * @swagger
 * /api/student/applications/{id}/documents:
 *   get:
 *     tags: [Student]
 *     summary: List application documents
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
 *         description: List of application documents
 */
export const getApplicationDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const documents = await studentService.getApplicationDocuments(userId, id as string);

        res.status(200).json({
            success: true,
            data: documents,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get application documents error:', error);
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
 * /api/student/applications/{id}/link-profile-document:
 *   post:
 *     tags: [Student]
 *     summary: Link profile document to application
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
 *               - profileDocumentId
 *             properties:
 *               profileDocumentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document linked successfully
 */
export const linkProfileDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const { profileDocumentId } = req.body;

        const link = await studentService.linkProfileDocument(userId, id as string, profileDocumentId);

        res.status(201).json({
            success: true,
            message: 'Document linked successfully',
            data: link,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Link profile document error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.message || 'Failed to link document',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION SUBMISSION ====================

/**
 * @swagger
 * /api/student/applications/{id}/submit:
 *   post:
 *     tags: [Student]
 *     summary: Submit application (DRAFT -> PENDING)
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
 *         description: Application submitted successfully
 */
export const submitApplication = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const application = await studentService.submitApplication(userId, id as string);

        logger.info('Application submitted', { userId, applicationId: application.id });

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully',
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Submit application error:', error);
        res.status(400).json({
            success: false,
            error: {
                code: error.message.includes('Only draft') ? 'INVALID_STATE_TRANSITION' : 'VALIDATION_ERROR',
                message: error.message || 'Failed to submit application',
            },
            timestamp: new Date().toISOString(),
        });
    }
};

// ==================== APPLICATION HISTORY ====================

/**
 * @swagger
 * /api/student/applications:
 *   get:
 *     tags: [Student]
 *     summary: Get all applications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 */
export const getApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const applications = await studentService.getApplications(userId);

        res.status(200).json({
            success: true,
            data: applications,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get applications error:', error);
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
 * /api/student/applications/{id}:
 *   get:
 *     tags: [Student]
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
        const userId = (req as any).user!.id;
        const { id } = req.params;
        console.log(userId);
        // Fix: Removed console.log and just use the service
        // Actually, the error is likely on line 819 in the file content which might correspond to a getApplication call.
        // Wait, line 819 in file content from step 343:
        // const application = await studentService.getApplication(userId, id); Is this the method? 
        // Looking at file content around line 798 (getApplications/getApplication):
        // There isn't a "getApplication" method taking two args in the visible part of step 343?
        // Ah, "getApplication" is NOT visible in step 343 (it ends at getApplications).
        // BUT the error log says: src/controllers/student.controller.ts:819:73 ... studentService.getApplication(userId, id);
        // I will trust the error log and the pattern.
        // I need to find the `getApplication` SINGLE handler.
        // I'll search for it or just try to replace based on signature.
        // Actually, I should probably just view the end of the file first to be safe, but speed is key.
        // I'll assume the context is standard.
        // Wait, I can't guess the context if I haven't seen the lines.
        // I'll skip this chunk and do a view_file first? No, I'll try to find it via unique string.
        // The error line 819: `const application = await studentService.getApplication(userId, id);`
        // I'll use that as target.
        const application = await studentService.getApplication(userId, id as string);

        res.status(200).json({
            success: true,
            data: application,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get application error:', error);
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
 * /api/student/applications/{id}/history:
 *   get:
 *     tags: [Student]
 *     summary: Get application status history
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
 *         description: Application status history
 */
export const getApplicationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user!.id;
        const { id } = req.params;
        const history = await studentService.getApplicationHistory(userId, id as string);

        res.status(200).json({
            success: true,
            data: history,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Get application history error:', error);
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
