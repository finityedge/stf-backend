import { Request, Response } from 'express';
import referenceService from '../services/reference.service';
import logger from '../config/logger';

/**
 * @swagger
 * /api/reference/counties:
 *   get:
 *     tags: [Reference]
 *     summary: Get all counties
 *     responses:
 *       200:
 *         description: List of counties
 * */
export const getCounties = async (_req: Request, res: Response): Promise<void> => {
    try {
        const counties = await referenceService.getCounties();

        res.status(200).json({
            success: true,
            data: counties,
        });
    } catch (error: any) {
        logger.error('Get counties error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get counties',
        });
    }
};

/**
 * @swagger
 * /api/reference/counties/{countyId}/sub-counties:
 *   get:
 *     tags: [Reference]
 *     summary: Get sub-counties for a county
 *     parameters:
 *       - in: path
 *         name: countyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sub-counties
 * */
export const getSubCounties = async (req: Request, res: Response): Promise<void> => {
    try {
        const { countyId } = req.params;
        const subCounties = await referenceService.getSubCounties(String(countyId));

        res.status(200).json({
            success: true,
            data: subCounties,
        });
    } catch (error: any) {
        logger.error('Get sub-counties error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sub-counties',
        });
    }
};

/**
 * @swagger
 * /api/reference/sub-counties/{subCountyId}/wards:
 *   get:
 *     tags: [Reference]
 *     summary: Get wards for a sub-county
 *     parameters:
 *       - in: path
 *         name: subCountyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of wards
 * */
export const getWards = async (req: Request, res: Response): Promise<void> => {
    try {
        const { subCountyId } = req.params;
        const wards = await referenceService.getWards(String(subCountyId));

        res.status(200).json({
            success: true,
            data: wards,
        });
    } catch (error: any) {
        logger.error('Get wards error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get wards',
        });
    }
};

/**
 * @swagger
 * /api/reference/document-types:
 *   get:
 *     tags: [Reference]
 *     summary: Get document types
 *     responses:
 *       200:
 *         description: List of document types
 * */
export const getDocumentTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
        const documentTypes = referenceService.getDocumentTypes();

        res.status(200).json({
            success: true,
            data: documentTypes,
        });
    } catch (error: any) {
        logger.error('Get document types error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get document types',
        });
    }
};

/**
 * @swagger
 * /api/reference/application-statuses:
 *   get:
 *     tags: [Reference]
 *     summary: Get application statuses
 *     responses:
 *       200:
 *         description: List of application statuses
 * */
export const getApplicationStatuses = async (_req: Request, res: Response): Promise<void> => {
    try {
        const statuses = referenceService.getApplicationStatuses();

        res.status(200).json({
            success: true,
            data: statuses,
        });
    } catch (error: any) {
        logger.error('Get application statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get application statuses',
        });
    }
};

/**
 * @swagger
 * /api/reference/education-levels:
 *   get:
 *     tags: [Reference]
 *     summary: Get education levels
 *     responses:
 *       200:
 *         description: List of education levels
 * */
export const getEducationLevels = async (_req: Request, res: Response): Promise<void> => {
    try {
        const levels = referenceService.getEducationLevels();

        res.status(200).json({
            success: true,
            data: levels,
        });
    } catch (error: any) {
        logger.error('Get education levels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get education levels',
        });
    }
};
