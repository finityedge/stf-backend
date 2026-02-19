import prisma from '../config/database';
import logger from '../config/logger';

export interface PortalConfig {
    academicYear: string;
    applicationDeadline: string | null;
    applicationWindowOpen: boolean;
    foundationName: string;
    contactEmail: string;
    contactPhone: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    activePeriod?: {
        id: string;
        title: string;
        startDate: string;
        endDate: string;
    } | null;
}

class ConfigService {
    /**
     * Compute the current academic year based on the calendar date.
     * Kenyan academic year runs roughly Jan–Dec, but university intake
     * is typically Sept. We use a simple rule:
     *   - Jan–Aug  → currentYear-1/currentYear  (e.g., 2025/26)
     *   - Sep–Dec  → currentYear/currentYear+1  (e.g., 2026/27)
     *
     * This can be overridden by the ACADEMIC_YEAR env var.
     */
    private computeAcademicYear(): string {
        const override = process.env.ACADEMIC_YEAR;
        if (override) return override;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed (0 = Jan)

        if (month >= 8) {
            // Sep–Dec
            return `${year}/${(year + 1).toString().slice(-2)}`;
        }
        // Jan–Aug
        return `${year - 1}/${year.toString().slice(-2)}`;
    }

    /**
     * Get current portal configuration.
     * Queries the active ApplicationPeriod from the database first.
     * Falls back to environment variables if no active period exists.
     */
    async getCurrentConfig(): Promise<PortalConfig> {
        let activePeriod = null;
        let applicationWindowOpen = process.env.APPLICATION_WINDOW_OPEN !== 'false';
        let applicationDeadline: string | null = process.env.APPLICATION_DEADLINE || null;
        let academicYear = this.computeAcademicYear();

        try {
            const dbPeriod = await prisma.applicationPeriod.findFirst({
                where: { isActive: true },
            });

            if (dbPeriod) {
                const now = new Date();
                applicationWindowOpen = now >= dbPeriod.startDate && now <= dbPeriod.endDate;
                applicationDeadline = dbPeriod.endDate.toISOString();
                academicYear = dbPeriod.academicYear;
                activePeriod = {
                    id: dbPeriod.id,
                    title: dbPeriod.title,
                    startDate: dbPeriod.startDate.toISOString(),
                    endDate: dbPeriod.endDate.toISOString(),
                };
            }
        } catch (err) {
            logger.error('Failed to query active application period', err);
            // Fall back to env vars — don't break the endpoint
        }

        const config: PortalConfig = {
            academicYear,
            applicationDeadline,
            applicationWindowOpen,
            foundationName: 'Soipan Tuya Foundation',
            contactEmail: process.env.CONTACT_EMAIL || 'info@soipantuyafoundation.org',
            contactPhone: process.env.CONTACT_PHONE || '+254 700 000 000',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
            allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'application/pdf,image/jpeg,image/png').split(','),
            activePeriod,
        };

        logger.debug('Portal config requested', { academicYear: config.academicYear });
        return config;
    }
}

export default new ConfigService();

