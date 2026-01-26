
import fs from 'fs';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import logger from '../config/logger';

export class FileService {


    /**
     * Get profile document path with access control
     */
    async getProfileDocumentPath(userId: string, role: string, documentId: string) {
        const document = await prisma.profileDocument.findUnique({
            where: { id: documentId },
            include: {
                studentProfile: true,
            },
        });

        if (!document) {
            throw new Error('Document not found');
        }

        // Access control
        if (role === UserRole.STUDENT) {
            if (document.studentProfile.userId !== userId) {
                logger.warn(`Access denied info: User ${userId} tried to access profile doc ${documentId} belonging to ${document.studentProfile.userId}`);
                throw new Error('Access denied');
            }
        }
        // Admins and Board can access all documents if authenticated
        else if (role !== UserRole.ADMIN && role !== UserRole.BOARD) {
            throw new Error('Access denied');
        }

        const filePath = document.filePath;

        // Verify file exists on disk
        if (!fs.existsSync(filePath)) {
            logger.error(`File missing on disk: ${filePath}`);
            throw new Error('File not found on server');
        }

        return {
            path: filePath,
            filename: document.originalFilename,
            mimeType: document.mimeType,
        };
    }

    /**
     * Get application document path with access control
     */
    async getApplicationDocumentPath(userId: string, role: string, documentId: string) {
        const document = await prisma.applicationDocument.findUnique({
            where: { id: documentId },
            include: {
                application: {
                    include: {
                        studentProfile: true,
                    },
                },
            },
        });

        if (!document) {
            throw new Error('Document not found');
        }

        // Access control
        if (role === UserRole.STUDENT) {
            if (document.application.studentProfile.userId !== userId) {
                logger.warn(`Access denied info: User ${userId} tried to access app doc ${documentId}`);
                throw new Error('Access denied');
            }
        }
        else if (role !== UserRole.ADMIN && role !== UserRole.BOARD) {
            throw new Error('Access denied');
        }

        const filePath = document.filePath;

        if (!fs.existsSync(filePath)) {
            logger.error(`File missing on disk: ${filePath}`);
            throw new Error('File not found on server');
        }

        return {
            path: filePath,
            filename: document.originalFilename,
            mimeType: document.mimeType,
        };
    }

    /**
     * Delete file from disk
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            logger.error('Error deleting file:', error);
            // Don't throw, just log
        }
    }
}

export default new FileService();
