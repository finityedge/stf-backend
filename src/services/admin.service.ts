import prisma from '../config/database';
import {
    ApplicationStatus,
    EducationLevel,
    NotificationType,
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
import notificationService from './notification.service';
import emailService from './email.service';

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

        // Send in-app notification and email to the student (non-blocking)
        try {
            const fullApp = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    studentProfile: {
                        include: { user: { select: { id: true, email: true } } }
                    }
                },
            });

            if (fullApp?.studentProfile?.user) {
                const studentUser = fullApp.studentProfile.user;
                const studentName = fullApp.snapshotFullName || 'Student';

                // In-app notification
                notificationService.createNotification(
                    studentUser.id,
                    NotificationType.STATUS_CHANGE,
                    `Application ${fullApp.applicationNumber} Updated`,
                    `Your application status has been changed to ${newStatus}.`,
                    { applicationId, previousStatus: application.status, newStatus }
                ).catch(err => logger.error('Notification send error', err));

                // Email notification
                emailService.sendApplicationStatusEmail(
                    studentUser.email,
                    studentName,
                    fullApp.applicationNumber,
                    newStatus
                ).catch(err => logger.error('Email send error', err));
            }
        } catch (err) {
            logger.error('Failed to send status change notification', err);
        }

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
    async addNote(applicationId: string, adminId: string, noteText: string, isPrivate: boolean = true, section?: string) {
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
                section: section || null,
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
                gpa: true,
                expectedGraduationDate: true,
                totalAnnualFeeAmount: true,
                remainingSemesters: true,
                appliedToOtherScholarships: true,
                communityInvolvement: true,
                careerAspirations: true,
                givingBackPlan: true,
                studentProfile: {
                    select: {
                        guardianName: true,
                        guardianPhone: true,
                        guardianOccupation: true,
                        householdIncomeRange: true,
                        orphanStatus: true,
                        disabilityStatus: true,
                        disabilityType: true,
                        whoLivesWith: true,
                        numberOfSiblings: true,
                        siblingsInSchool: true,
                        numberOfDependents: true,
                        kcseGrade: true,
                        previousScholarship: true,
                    }
                }
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
            'Guardian Name',
            'Guardian Phone',
            'Household Income',
            'Orphan Status',
            'Disability',
            'Who Lives With',
            'Siblings',
            'KCSE Grade',
            'GPA',
            'Total Annual Fee (KES)',
            'Career Aspirations',
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
            app.studentProfile?.guardianName || '',
            app.studentProfile?.guardianPhone || '',
            app.studentProfile?.householdIncomeRange || '',
            app.studentProfile?.orphanStatus || '',
            app.studentProfile?.disabilityStatus ? 'Yes' : 'No',
            app.studentProfile?.whoLivesWith || '',
            app.studentProfile?.numberOfSiblings?.toString() || '',
            app.studentProfile?.kcseGrade || '',
            app.gpa || '',
            app.totalAnnualFeeAmount?.toString() || '',
            app.careerAspirations || '',
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

    // ==================== APPLICATION PERIODS ====================

    /**
     * Get all application periods
     */
    async getApplicationPeriods() {
        return prisma.applicationPeriod.findMany({
            orderBy: { startDate: 'desc' },
        });
    }

    /**
     * Create a new application period
     */
    async createApplicationPeriod(data: {
        academicYear: string;
        title: string;
        description?: string;
        startDate: string;
        endDate: string;
    }) {
        return prisma.applicationPeriod.create({
            data: {
                academicYear: data.academicYear,
                title: data.title,
                description: data.description,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            },
        });
    }

    /**
     * Update an application period
     */
    async updateApplicationPeriod(id: string, data: {
        academicYear?: string;
        title?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const period = await prisma.applicationPeriod.findUnique({ where: { id } });
        if (!period) throw new Error('Application period not found');

        return prisma.applicationPeriod.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
            },
        });
    }

    /**
     * Delete an application period
     */
    async deleteApplicationPeriod(id: string) {
        const period = await prisma.applicationPeriod.findUnique({ where: { id } });
        if (!period) throw new Error('Application period not found');
        if (period.isActive) throw new Error('Cannot delete an active application period');

        await prisma.applicationPeriod.delete({ where: { id } });
        return { deleted: true };
    }

    /**
     * Activate an application period (deactivates all others)
     */
    async activateApplicationPeriod(id: string) {
        const period = await prisma.applicationPeriod.findUnique({ where: { id } });
        if (!period) throw new Error('Application period not found');

        return prisma.$transaction(async (tx) => {
            // Deactivate all periods
            await tx.applicationPeriod.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });

            // Activate the target period
            return tx.applicationPeriod.update({
                where: { id },
                data: { isActive: true },
            });
        });
    }

    // ==================== APPLICATION SCORING ====================

    /**
     * Score an application (create or update)
     */
    async scoreApplication(
        applicationId: string,
        reviewerId: string,
        scores: {
            financialNeed: number;
            academicMerit: number;
            communityImpact: number;
            vulnerability: number;
            comments?: string;
        }
    ) {
        const application = await prisma.application.findUnique({
            where: { id: applicationId },
        });

        if (!application) throw new Error('Application not found');

        const overallScore = (
            scores.financialNeed +
            scores.academicMerit +
            scores.communityImpact +
            scores.vulnerability
        ) / 4;

        return prisma.reviewScore.upsert({
            where: {
                applicationId_reviewerId: {
                    applicationId,
                    reviewerId,
                },
            },
            update: {
                ...scores,
                overallScore,
            },
            create: {
                applicationId,
                reviewerId,
                ...scores,
                overallScore,
            },
        });
    }

    /**
     * Get all scores for an application
     */
    async getApplicationScores(applicationId: string) {
        const scores = await prisma.reviewScore.findMany({
            where: { applicationId },
            include: {
                reviewer: {
                    select: { email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const averageScore = scores.length > 0
            ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
            : null;

        return {
            scores,
            averageScore,
            totalReviewers: scores.length,
        };
    }

    /**
     * Get scoring rubric definition
     */
    getScoringRubric() {
        return {
            criteria: [
                {
                    key: 'financialNeed',
                    label: 'Financial Need',
                    description: 'Level of financial hardship and need for bursary support',
                    min: 1,
                    max: 5,
                    weight: 0.25,
                },
                {
                    key: 'academicMerit',
                    label: 'Academic Merit',
                    description: 'Academic performance and potential',
                    min: 1,
                    max: 5,
                    weight: 0.25,
                },
                {
                    key: 'communityImpact',
                    label: 'Community Impact',
                    description: 'Community involvement and potential to give back',
                    min: 1,
                    max: 5,
                    weight: 0.25,
                },
                {
                    key: 'vulnerability',
                    label: 'Vulnerability',
                    description: 'Orphan status, disability, and social vulnerability',
                    min: 1,
                    max: 5,
                    weight: 0.25,
                },
            ],
            totalMaxScore: 5,
        };
    }

    // ==================== ENHANCED ANALYTICS ====================

    /**
     * Gender analytics
     */
    async getGenderAnalytics() {
        const results = await prisma.$queryRaw<
            Array<{ gender: string; total: bigint; approved: bigint; rejected: bigint }>
        >`
            SELECT
                sp."gender",
                COUNT(a.id)::bigint AS total,
                COUNT(CASE WHEN a.status = 'APPROVED' OR a.status = 'DISBURSED' THEN 1 END)::bigint AS approved,
                COUNT(CASE WHEN a.status = 'REJECTED' THEN 1 END)::bigint AS rejected
            FROM applications a
            JOIN student_profiles sp ON a."studentProfileId" = sp.id
            WHERE a.status != 'DRAFT'
            GROUP BY sp."gender"
        `;

        return results.map(r => ({
            gender: r.gender,
            total: Number(r.total),
            approved: Number(r.approved),
            rejected: Number(r.rejected),
        }));
    }

    /**
     * Conversion funnel analytics
     */
    async getFunnelAnalytics() {
        const [draft, pending, underReview, approved, disbursed] = await Promise.all([
            prisma.application.count({ where: { status: 'DRAFT' } }),
            prisma.application.count({ where: { status: 'PENDING' } }),
            prisma.application.count({ where: { status: 'UNDER_REVIEW' } }),
            prisma.application.count({ where: { status: 'APPROVED' } }),
            prisma.application.count({ where: { status: 'DISBURSED' } }),
        ]);

        const totalSubmitted = pending + underReview + approved + disbursed;

        return {
            stages: [
                { stage: 'Draft', count: draft, percentage: 100 },
                { stage: 'Submitted', count: totalSubmitted, percentage: draft > 0 ? Math.round((totalSubmitted / (draft + totalSubmitted)) * 100) : 0 },
                { stage: 'Under Review', count: underReview + approved + disbursed, percentage: totalSubmitted > 0 ? Math.round(((underReview + approved + disbursed) / totalSubmitted) * 100) : 0 },
                { stage: 'Approved', count: approved + disbursed, percentage: totalSubmitted > 0 ? Math.round(((approved + disbursed) / totalSubmitted) * 100) : 0 },
                { stage: 'Disbursed', count: disbursed, percentage: totalSubmitted > 0 ? Math.round((disbursed / totalSubmitted) * 100) : 0 },
            ],
        };
    }

    /**
     * Time-to-decision analytics
     */
    async getTimeToDecisionAnalytics() {
        const results = await prisma.$queryRaw<
            Array<{ new_status: string; avg_days: number }>
        >`
            SELECT
                ash."newStatus" as new_status,
                AVG(EXTRACT(EPOCH FROM (ash."changedAt" - a."submittedAt")) / 86400)::float AS avg_days
            FROM application_status_history ash
            JOIN applications a ON ash."applicationId" = a.id
            WHERE a."submittedAt" IS NOT NULL
            AND ash."newStatus" IN ('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED')
            GROUP BY ash."newStatus"
        `;

        return results.map(r => ({
            status: r.new_status,
            averageDays: Math.round((r.avg_days || 0) * 10) / 10,
        }));
    }

    /**
     * Demographics analytics (orphan, disability, age, income)
     */
    async getDemographicsAnalytics() {
        const [orphanData, disabilityData, incomeData] = await Promise.all([
            prisma.studentProfile.groupBy({
                by: ['orphanStatus'],
                _count: { id: true },
                where: { orphanStatus: { not: null } },
            }),
            prisma.studentProfile.groupBy({
                by: ['disabilityStatus'],
                _count: { id: true },
            }),
            prisma.studentProfile.groupBy({
                by: ['householdIncomeRange'],
                _count: { id: true },
                where: { householdIncomeRange: { not: null } },
            }),
        ]);

        return {
            orphanStatus: orphanData.map(d => ({
                status: d.orphanStatus,
                count: d._count.id,
            })),
            disability: disabilityData.map(d => ({
                hasDisability: d.disabilityStatus,
                count: d._count.id,
            })),
            householdIncome: incomeData.map(d => ({
                range: d.householdIncomeRange,
                count: d._count.id,
            })),
        };
    }
}

export default new AdminService();
