import prisma from '../config/database';

export class ReferenceService {
    /**
     * Get all counties
     */
    async getCounties() {
        const counties = await prisma.county.findMany({
            orderBy: { name: 'asc' },
        });

        return counties;
    }

    /**
     * Get sub-counties by county ID
     */
    async getSubCounties(countyId: string) {
        const subCounties = await prisma.subCounty.findMany({
            where: { countyId },
            orderBy: { name: 'asc' },
        });

        return subCounties;
    }

    /**
     * Get wards by sub-county ID
     */
    async getWards(subCountyId: string) {
        const wards = await prisma.ward.findMany({
            where: { subCountyId },
            orderBy: { name: 'asc' },
        });

        return wards;
    }

    /**
     * Get document types enum
     */
    getDocumentTypes() {
        return ['NATIONAL_ID', 'FEES_STRUCTURE', 'CERTIFICATE'];
    }

    /**
     * Get application status options
     */
    getApplicationStatuses() {
        return ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED'];
    }

    /**
     * Get education levels
     */
    getEducationLevels() {
        return ['HIGH_SCHOOL', 'UNIVERSITY'];
    }
}

export default new ReferenceService();
