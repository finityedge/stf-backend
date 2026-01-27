import prisma from '../config/database';
import {
    ApplicationStatus,
    EducationLevel,
    Prisma
} from '@prisma/client';
import {
    ApplicationFilterParams,
    BulkUpdateRequest,
    BulkUpdateResponse,
    AnalyticsSummary,
    CountyAnalytics,
    InstitutionAnalytics,
    DisbursementAnalytics,
    TimelineEvent,
    isValidStatusTransition
} from '../types/api.types';
import logger from '../config/logger';

export class AdminService {
    // ==================== APPLICATION LIST ====================

    /**
     * List all applications with filtering, sorting, and pagination
     */
    async listApplications(params: ApplicationFilterParams) {
        const {
            page = 1,
            limit = 20,
            status,
            educationLevel,
            county,
            minBalance,
            maxBalance,
            submittedAfter,
            submittedBefore,
            hasBeenSentHome,
            search,
            sortBy = 'submittedAt',
            sortOrder = 'desc',
        } = params;

        const pageNumber = Number(page) || 1;
        const limitNumber = Number(limit) || 20;

        const skip = (pageNumber - 1) * limitNumber;

        // Build where clause
        const where: Prisma.ApplicationWhereInput = {};

        // Status filter (supports array)
        if (status) {
            if (Array.isArray(status)) {
                where.status = { in: status };
            } else {
                where.status = status;
            }
        }

        // Education level filter
        if (educationLevel) {
            where.snapshotEducationLevel = educationLevel;
        }

        // County filter
        if (county) {
            where.snapshotCounty = { contains: county, mode: 'insensitive' };
        }

        // Balance range filter
        if (minBalance !== undefined || maxBalance !== undefined) {
            where.outstandingFeesBalance = {};
            if (minBalance !== undefined) {
                where.outstandingFeesBalance.gte = minBalance;
            }
            if (maxBalance !== undefined) {
                where.outstandingFeesBalance.lte = maxBalance;
            }
        }

        // Date range filter
        if (submittedAfter || submittedBefore) {
            where.submittedAt = {};
            if (submittedAfter) {
                where.submittedAt.gte = submittedAfter;
            }
            if (submittedBefore) {
                where.submittedAt.lte = submittedBefore;
            }
        }

        // Has been sent home filter
        if (hasBeenSentHome !== undefined) {
            where.hasBeenSentHome = hasBeenSentHome;
        }

        // Search filter (name, ID, institution)
        if (search) {
            where.OR = [
                { snapshotFullName: { contains: search, mode: 'insensitive' } },
                { snapshotNationalId: { contains: search, mode: 'insensitive' } },
                { snapshotInstitution: { contains: search, mode: 'insensitive' } },
                { applicationNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Build order by
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        // Execute queries
        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy,
                include: {
                    studentProfile: {
                        select: {
                            id: true,
                            fullName: true,
                            institutionType: true,
                        },
                    },
                    statusHistory: {
                        orderBy: { changedAt: 'desc' },
                        take: 1,
                    },
                },
            }),
            prisma.application.count({ where }),
        ]);

        return {
            data: applications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ==================== SINGLE APPLICATION ====================

    /**
     * Get single application with full details
     */
    async getApplication(applicationId: string) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                studentProfile: {
                    include: {
                        county: true,
                        subCounty: true,
                        ward: true,
                        user: {
                            select: { email: true, phone: true },
                        },
                    },
                },
                applicationDocuments: true,
                profileDocumentLinks: {
                    include: { profileDocument: true },
                },
                adminNotes: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        admin: {
                            select: { email: true },
                        },
                    },
                },
                statusHistory: {
                    orderBy: { changedAt: 'desc' },
                    include: {
                        changedByUser: {
                            select: { email: true },
                        },
                    },
                },
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        return application;
    }

    // ==================== STATUS UPDATE ====================

    /**
     * Update application status with state machine validation
     */
    async updateApplicationStatus(
        applicationId: string,
        adminId: string,
        newStatus: ApplicationStatus,
        notes?: string,
        disbursedAmount?: number
    ) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        // Validate state transition
        if (!isValidStatusTransition(application.status, newStatus)) {
            throw new Error(
                `Invalid status transition from ${application.status} to ${newStatus}`
            );
        }

        // Handle disbursement
        const updateData: Prisma.ApplicationUpdateInput = {
            status: newStatus,
            reviewedAt: new Date(),
            reviewedBy: adminId,
        };

        if (newStatus === ApplicationStatus.DISBURSED) {
            if (!disbursedAmount) {
                throw new Error('Disbursement amount is required for DISBURSED status');
            }
            updateData.disbursedAmount = disbursedAmount;
            updateData.disbursedAt = new Date();
            updateData.disbursementNotes = notes;
        }

        // Update in transaction
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.application.update({
                where: { id: applicationId },
                data: updateData,
            });

            // Create status history entry
            await tx.applicationStatusHistory.create({
                data: {
                    applicationId,
                    previousStatus: application.status,
                    newStatus,
                    changedBy: adminId,
                    reason: notes,
                    autoGenerated: false,
                },
            });

            return result;
        });

        logger.info(`Application ${applicationId} status changed from ${application.status} to ${newStatus} by admin ${adminId}`);
        return updated;
    }

    // ==================== BULK UPDATE ====================

    /**
     * Bulk update application statuses
     */
    async bulkUpdate(adminId: string, request: BulkUpdateRequest): Promise<BulkUpdateResponse> {
        const { applicationIds, newStatus, note } = request;

        const results = {
            success: true,
            updated: 0,
            failed: 0,
            errors: [] as Array<{ applicationId: string; error: string }>,
        };

        for (const applicationId of applicationIds) {
            try {
                await this.updateApplicationStatus(applicationId, adminId, newStatus, note);
                results.updated++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({
                    applicationId,
                    error: error.message,
                });
            }
        }

        results.success = results.failed === 0;
        logger.info(`Bulk update completed: ${results.updated} updated, ${results.failed} failed`);
        return results;
    }

    // ==================== STUDENT CONTEXT ====================

    /**
     * Get student overview by profile ID
     */
    async getStudentOverview(profileId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { id: profileId },
            include: {
                county: true,
                subCounty: true,
                ward: true,
                user: {
                    select: {
                        email: true,
                        phone: true,
                        createdAt: true,
                        isActive: true,
                    },
                },
                profileDocuments: {
                    orderBy: { uploadedAt: 'desc' },
                },
                _count: {
                    select: { applications: true },
                },
            },
        });

        if (!profile) {
            throw new Error('Student profile not found');
        }

        // Get application stats
        const applicationStats = await prisma.application.groupBy({
            by: ['status'],
            where: { studentProfileId: profileId },
            _count: { status: true },
        });

        return {
            ...profile,
            applicationStats,
        };
    }

    /**
     * Get all applications by student
     */
    async getStudentApplications(profileId: string) {
        const applications = await prisma.application.findMany({
            where: { studentProfileId: profileId },
            orderBy: { createdAt: 'desc' },
            include: {
                statusHistory: {
                    orderBy: { changedAt: 'desc' },
                    take: 1,
                },
            },
        });

        return applications;
    }

    /**
     * Get all documents for a student
     */
    async getStudentDocuments(profileId: string) {
        // Get profile documents
        const profileDocuments = await prisma.profileDocument.findMany({
            where: { studentProfileId: profileId },
            orderBy: { uploadedAt: 'desc' },
        });

        // Get application documents
        const applicationDocuments = await prisma.applicationDocument.findMany({
            where: {
                application: { studentProfileId: profileId },
            },
            include: {
                application: {
                    select: { applicationNumber: true, status: true },
                },
            },
            orderBy: { uploadedAt: 'desc' },
        });

        return {
            profileDocuments,
            applicationDocuments,
        };
    }

    /**
     * Get chronological timeline for a student
     */
    async getStudentTimeline(profileId: string): Promise<TimelineEvent[]> {
        const timeline: TimelineEvent[] = [];

        // Get profile
        const profile = await prisma.studentProfile.findUnique({
            where: { id: profileId },
            select: { createdAt: true, updatedAt: true },
        });

        if (profile) {
            timeline.push({
                type: 'PROFILE_UPDATED',
                timestamp: profile.createdAt.toISOString(),
                description: 'Student profile created',
            });
        }

        // Get all applications with their history
        const applications = await prisma.application.findMany({
            where: { studentProfileId: profileId },
            include: {
                statusHistory: true,
                adminNotes: {
                    where: { deletedAt: null },
                },
            },
        });

        for (const app of applications) {
            timeline.push({
                type: 'APPLICATION_CREATED',
                timestamp: app.createdAt.toISOString(),
                description: `Application ${app.applicationNumber} created`,
                metadata: { applicationId: app.id },
            });

            if (app.submittedAt) {
                timeline.push({
                    type: 'APPLICATION_SUBMITTED',
                    timestamp: app.submittedAt.toISOString(),
                    description: `Application ${app.applicationNumber} submitted`,
                    metadata: { applicationId: app.id },
                });
            }

            for (const history of app.statusHistory) {
                if (history.previousStatus) {
                    timeline.push({
                        type: 'STATUS_CHANGED',
                        timestamp: history.changedAt.toISOString(),
                        description: `Status changed from ${history.previousStatus} to ${history.newStatus}`,
                        metadata: {
                            applicationId: app.id,
                            reason: history.reason,
                        },
                    });
                }
            }

            for (const note of app.adminNotes) {
                timeline.push({
                    type: 'NOTE_ADDED',
                    timestamp: note.createdAt.toISOString(),
                    description: 'Admin note added',
                    metadata: { applicationId: app.id },
                });
            }
        }

        // Sort by timestamp descending
        timeline.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return timeline;
    }

    // ==================== ADMIN NOTES ====================

    /**
     * Add admin note to application
     */
    async addNote(applicationId: string, adminId: string, noteText: string, isPrivate: boolean = true) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        const note = await prisma.adminNote.create({
            data: {
                applicationId,
                adminId,
                noteText,
                isPrivate,
            },
            include: {
                admin: {
                    select: { email: true },
                },
            },
        });

        logger.info(`Note added to application ${applicationId} by admin ${adminId}`);
        return note;
    }

    /**
     * Update admin note
     */
    async updateNote(noteId: string, adminId: string, noteText: string) {
        const note = await prisma.adminNote.findUnique({
            where: { id: noteId },
        });

        if (!note) {
            throw new Error('Note not found');
        }

        if (note.adminId !== adminId) {
            throw new Error('You can only edit your own notes');
        }

        if (note.deletedAt) {
            throw new Error('Cannot edit deleted note');
        }

        const updated = await prisma.adminNote.update({
            where: { id: noteId },
            data: { noteText },
        });

        logger.info(`Note ${noteId} updated by admin ${adminId}`);
        return updated;
    }

    /**
     * Delete admin note (soft delete)
     */
    async deleteNote(noteId: string, adminId: string) {
        const note = await prisma.adminNote.findUnique({
            where: { id: noteId },
        });

        if (!note) {
            throw new Error('Note not found');
        }

        if (note.adminId !== adminId) {
            throw new Error('You can only delete your own notes');
        }

        await prisma.adminNote.update({
            where: { id: noteId },
            data: { deletedAt: new Date() },
        });

        logger.info(`Note ${noteId} soft deleted by admin ${adminId}`);
        return { success: true };
    }

    // ==================== ANALYTICS ====================

    /**
     * Get analytics summary (KPIs)
     */
    async getAnalyticsSummary(): Promise<AnalyticsSummary> {
        // Status counts
        const statusCounts = await prisma.application.groupBy({
            by: ['status'],
            _count: { status: true },
        });

        const byStatus: Record<ApplicationStatus, number> = {
            DRAFT: 0,
            PENDING: 0,
            UNDER_REVIEW: 0,
            APPROVED: 0,
            REJECTED: 0,
            DISBURSED: 0,
        };

        for (const item of statusCounts) {
            byStatus[item.status] = item._count.status;
        }

        // Total applications
        const totalApplications = Object.values(byStatus).reduce((a, b) => a + b, 0);

        // Total disbursed amount
        const disbursementResult = await prisma.application.aggregate({
            _sum: { disbursedAmount: true },
            where: { status: ApplicationStatus.DISBURSED },
        });
        const totalDisbursed = Number(disbursementResult._sum.disbursedAmount || 0);

        // Average fee balance for pending applications
        const avgBalanceResult = await prisma.application.aggregate({
            _avg: { outstandingFeesBalance: true },
            where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        });
        const averageFeeBalance = Number(avgBalanceResult._avg.outstandingFeesBalance || 0);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const trendData = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
            SELECT TO_CHAR(DATE_TRUNC('month', "submittedAt"), 'YYYY-MM') as month, 
                   COUNT(*) as count
            FROM applications 
            WHERE "submittedAt" >= ${sixMonthsAgo}
            GROUP BY DATE_TRUNC('month', "submittedAt")
            ORDER BY month ASC
        `;

        const applicationsTrend = trendData.map(item => ({
            period: item.month,
            count: Number(item.count),
        }));

        return {
            totalApplications,
            byStatus,
            totalDisbursed,
            averageFeeBalance,
            applicationsTrend,
        };
    }

    /**
     * Get analytics by county
     */
    async getAnalyticsByCounty(): Promise<CountyAnalytics[]> {
        const results = await prisma.$queryRaw<Array<{
            county: string;
            total: bigint;
            pending: bigint;
            approved: bigint;
            rejected: bigint;
            disbursed: bigint;
            disbursed_amount: number | null;
        }>>`
            SELECT 
                "snapshotCounty" as county,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'DISBURSED' THEN 1 ELSE 0 END) as disbursed,
                SUM(CASE WHEN status = 'DISBURSED' THEN "disbursedAmount" ELSE 0 END) as disbursed_amount
            FROM applications
            WHERE "snapshotCounty" IS NOT NULL
            GROUP BY "snapshotCounty"
            ORDER BY total DESC
        `;

        return results.map(row => ({
            countyName: row.county,
            countyId: '', // Would need to join with counties table for this
            totalApplications: Number(row.total),
            pending: Number(row.pending),
            approved: Number(row.approved),
            rejected: Number(row.rejected),
            disbursed: Number(row.disbursed),
            totalDisbursedAmount: Number(row.disbursed_amount || 0),
        }));
    }

    /**
     * Get analytics by institution type
     */
    async getAnalyticsByInstitution(): Promise<InstitutionAnalytics[]> {
        const results = await prisma.$queryRaw<Array<{
            institution: string;
            education_level: EducationLevel;
            total: bigint;
            approved: bigint;
            disbursed_amount: number | null;
        }>>`
            SELECT 
                "snapshotInstitution" as institution,
                "snapshotEducationLevel" as education_level,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'APPROVED' OR status = 'DISBURSED' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'DISBURSED' THEN "disbursedAmount" ELSE 0 END) as disbursed_amount
            FROM applications
            WHERE "snapshotInstitution" IS NOT NULL
            GROUP BY "snapshotInstitution", "snapshotEducationLevel"
            ORDER BY total DESC
            LIMIT 20
        `;

        return results.map(row => ({
            institutionName: row.institution,
            institutionType: row.education_level,
            totalApplications: Number(row.total),
            approved: Number(row.approved),
            totalDisbursedAmount: Number(row.disbursed_amount || 0),
        }));
    }

    /**
     * Get disbursement analytics
     */
    async getDisbursementAnalytics(): Promise<DisbursementAnalytics> {
        // Total stats
        const totals = await prisma.application.aggregate({
            _sum: { disbursedAmount: true },
            _count: { id: true },
            _avg: { disbursedAmount: true },
            where: { status: ApplicationStatus.DISBURSED },
        });

        // By month (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyData = await prisma.$queryRaw<Array<{
            month: string;
            amount: number | null;
            count: bigint;
        }>>`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', "disbursedAt"), 'YYYY-MM') as month,
                SUM("disbursedAmount")::numeric as amount,
                COUNT(*) as count
            FROM applications
            WHERE status = 'DISBURSED' AND "disbursedAt" >= ${twelveMonthsAgo}
            GROUP BY DATE_TRUNC('month', "disbursedAt")
            ORDER BY month ASC
        `;

        // By education level
        const byLevelData = await prisma.application.groupBy({
            by: ['snapshotEducationLevel'],
            where: { status: ApplicationStatus.DISBURSED },
            _sum: { disbursedAmount: true },
            _count: { id: true },
        });

        const byEducationLevel: Record<EducationLevel, { amount: number; count: number }> = {
            HIGH_SCHOOL: { amount: 0, count: 0 },
            UNIVERSITY: { amount: 0, count: 0 },
            COLLEGE: { amount: 0, count: 0 },
            TVET: { amount: 0, count: 0 },
        };

        for (const item of byLevelData) {
            if (item.snapshotEducationLevel) {
                byEducationLevel[item.snapshotEducationLevel] = {
                    amount: Number(item._sum.disbursedAmount || 0),
                    count: item._count.id,
                };
            }
        }

        return {
            totalDisbursed: Number(totals._sum.disbursedAmount || 0),
            totalBeneficiaries: totals._count.id,
            averageDisbursement: Number(totals._avg.disbursedAmount || 0),
            byMonth: monthlyData.map(item => ({
                month: item.month,
                amount: Number(item.amount || 0),
                count: Number(item.count),
            })),
            byEducationLevel,
        };
    }

    // ==================== SEARCH ====================

    /**
     * Search students
     */
    async searchStudents(query: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [students, total] = await Promise.all([
            prisma.studentProfile.findMany({
                where: {
                    OR: [
                        { fullName: { contains: query, mode: 'insensitive' } },
                        { nationalIdNumber: { contains: query } },
                        { passportNumber: { contains: query } },
                        { institutionName: { contains: query, mode: 'insensitive' } },
                        { user: { email: { contains: query, mode: 'insensitive' } } },
                        { user: { phone: { contains: query } } },
                    ],
                },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { email: true, phone: true },
                    },
                    _count: {
                        select: { applications: true },
                    },
                },
            }),
            prisma.studentProfile.count({
                where: {
                    OR: [
                        { fullName: { contains: query, mode: 'insensitive' } },
                        { nationalIdNumber: { contains: query } },
                        { passportNumber: { contains: query } },
                        { institutionName: { contains: query, mode: 'insensitive' } },
                        { user: { email: { contains: query, mode: 'insensitive' } } },
                        { user: { phone: { contains: query } } },
                    ],
                },
            }),
        ]);

        return {
            data: students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ==================== EXPORT ====================

    /**
     * Export applications to CSV format
     */
    async exportApplications(filters: Partial<ApplicationFilterParams>) {
        const where: Prisma.ApplicationWhereInput = {};

        if (filters.status) {
            if (Array.isArray(filters.status)) {
                where.status = { in: filters.status };
            } else {
                where.status = filters.status;
            }
        }

        if (filters.educationLevel) {
            where.snapshotEducationLevel = filters.educationLevel;
        }

        if (filters.county) {
            where.snapshotCounty = { contains: filters.county, mode: 'insensitive' };
        }

        if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
            where.outstandingFeesBalance = {};
            if (filters.minBalance !== undefined) {
                where.outstandingFeesBalance.gte = filters.minBalance;
            }
            if (filters.maxBalance !== undefined) {
                where.outstandingFeesBalance.lte = filters.maxBalance;
            }
        }

        const applications = await prisma.application.findMany({
            where,
            orderBy: { submittedAt: 'desc' },
            select: {
                applicationNumber: true,
                snapshotFullName: true,
                snapshotNationalId: true,
                snapshotEmail: true,
                snapshotPhone: true,
                snapshotInstitution: true,
                snapshotProgramme: true,
                snapshotEducationLevel: true,
                snapshotCounty: true,
                outstandingFeesBalance: true,
                status: true,
                submittedAt: true,
                disbursedAmount: true,
                disbursedAt: true,
            },
        });

        // Generate CSV header
        const headers = [
            'Application Number',
            'Full Name',
            'National ID',
            'Email',
            'Phone',
            'Institution',
            'Programme',
            'Education Level',
            'County',
            'Outstanding Fees (KES)',
            'Status',
            'Submitted At',
            'Disbursed Amount (KES)',
            'Disbursed At',
        ];

        // Generate CSV rows
        const rows = applications.map(app => [
            app.applicationNumber,
            app.snapshotFullName || '',
            app.snapshotNationalId || '',
            app.snapshotEmail || '',
            app.snapshotPhone || '',
            app.snapshotInstitution || '',
            app.snapshotProgramme || '',
            app.snapshotEducationLevel || '',
            app.snapshotCounty || '',
            app.outstandingFeesBalance?.toString() || '',
            app.status,
            app.submittedAt?.toISOString() || '',
            app.disbursedAmount?.toString() || '',
            app.disbursedAt?.toISOString() || '',
        ]);

        const csv = [headers.join(','), ...rows.map(row =>
            row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
        )].join('\n');

        return {
            csv,
            count: applications.length,
            filename: `stf-applications-export-${new Date().toISOString().split('T')[0]}.csv`,
        };
    }
}

export default new AdminService();
