import { Request, Response } from 'express';
import fileService from '../services/file.service';
import logger from '../config/logger';

/**
 * @swagger
 * /api/files/profile/{documentId}:
 *   get:
 *     tags: [Files]
 *     summary: Download a profile document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File download
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or file not found
 */
export const downloadProfileDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documentId } = req.params;
        const user = (req as any).user!;

        const fileInfo = await fileService.getProfileDocumentPath(
            user.id,
            user.role,
            documentId as string
        );

        res.download(fileInfo.path, fileInfo.filename);
    } catch (error: any) {
        logger.error(`Download profile document error: ${error.message}`);

        if (error.message === 'Access denied') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'AUTHORIZATION_DENIED',
                    message: 'You do not have permission to access this document',
                },
            });
            return;
        }

        if (error.message === 'Document not found' || error.message === 'File not found on server') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'RESOURCE_NOT_FOUND',
                    message: 'Document not found',
                },
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to download document',
            },
        });
    }
};

/**
 * @swagger
 * /api/files/application/{documentId}:
 *   get:
 *     tags: [Files]
 *     summary: Download an application document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File download
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or file not found
 */
export const downloadApplicationDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documentId } = req.params;
        const user = (req as any).user!;

        const fileInfo = await fileService.getApplicationDocumentPath(
            user.id,
            user.role,
            documentId as string
        );

        res.download(fileInfo.path, fileInfo.filename);
    } catch (error: any) {
        logger.error(`Download application document error: ${error.message}`);

        if (error.message === 'Access denied') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'AUTHORIZATION_DENIED',
                    message: 'You do not have permission to access this document',
                },
            });
            return;
        }

        if (error.message === 'Document not found' || error.message === 'File not found on server') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'RESOURCE_NOT_FOUND',
                    message: 'Document not found',
                },
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to download document',
            },
        });
    }
};
