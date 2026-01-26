import prisma from '../config/database';
import {
    EducationLevel,
    ApplicationStatus,
    ProfileDocumentType,
    ApplicationDocumentType,
    Prisma
} from '@prisma/client';

import {
    EligibilityResponse,
    ProfileCompletenessResponse,
    CreateDraftRequest,
    UpdateDraftRequest,
    ACTIVE_APPLICATION_STATUSES
} from '../types/api.types';
import {
    calculateAge,
    getAgeRange,
    generateApplicationNumber
} from '../utils/validators';
import logger from '../config/logger';

export class StudentService {
    // ==================== PROFILE MANAGEMENT ====================

    /**
     * Get student profile by user ID
     */
    async getProfile(userId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                county: true,
                subCounty: true,
                ward: true,
                profileDocuments: {
                    orderBy: { uploadedAt: 'desc' }
                },
            },
        });

        return profile;
    }

    /**
     * Create student profile
     */
    async createProfile(userId: string, data: {
        fullName: string;
        dateOfBirth: Date;
        gender: string;
        nationalIdNumber?: string;
        passportNumber?: string;
        countyId: string;
        subCountyId: string;
        wardId: string;
        currentResidence?: string;
        institutionName: string;
        institutionType: EducationLevel;
        programmeOrCourse: string;
        admissionYear: number;
        whoLivesWith?: string;
    }) {
        // Check if profile already exists
        const existingProfile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (existingProfile) {
            throw new Error('Profile already exists');
        }

        // Check if national ID is already used
        if (data.nationalIdNumber) {
            const existingNationalId = await prisma.studentProfile.findUnique({
                where: { nationalIdNumber: data.nationalIdNumber },
            });

            if (existingNationalId) {
                throw new Error('National ID already registered');
            }
        }

        // Check if passport is already used
        if (data.passportNumber) {
            const existingPassport = await prisma.studentProfile.findUnique({
                where: { passportNumber: data.passportNumber },
            });

            if (existingPassport) {
                throw new Error('Passport number already registered');
            }
        }

        // Calculate age range for analytics
        const age = calculateAge(data.dateOfBirth);
        const ageRange = getAgeRange(age);

        // Create profile
        const profile = await prisma.studentProfile.create({
            data: {
                ...data,
                userId,
                ageRange,
                isComplete: this.checkProfileComplete(data),
            },
            include: {
                county: true,
                subCounty: true,
                ward: true,
            },
        });

        logger.info(`Profile created for user ${userId}`);
        return profile;
    }

    /**
     * Update student profile
     */
    async updateProfile(userId: string, data: Partial<{
        fullName: string;
        dateOfBirth: Date;
        gender: string;
        nationalIdNumber?: string;
        passportNumber?: string;
        countyId: string;
        subCountyId: string;
        wardId: string;
        currentResidence?: string;
        institutionName: string;
        institutionType: EducationLevel;
        programmeOrCourse: string;
        admissionYear: number;
        whoLivesWith?: string;
    }>) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Check for active application - cannot update during review
        const activeApplication = await prisma.application.findFirst({
            where: {
                studentProfileId: profile.id,
                status: { in: ['PENDING', 'UNDER_REVIEW'] },
            },
        });

        if (activeApplication) {
            throw new Error('Cannot update profile while application is under review');
        }

        // Check if national ID is being changed and if it's already used
        if (data.nationalIdNumber && data.nationalIdNumber !== profile.nationalIdNumber) {
            const existingNationalId = await prisma.studentProfile.findUnique({
                where: { nationalIdNumber: data.nationalIdNumber },
            });

            if (existingNationalId) {
                throw new Error('National ID already registered');
            }
        }

        // Check if passport is being changed and if it's already used
        if (data.passportNumber && data.passportNumber !== profile.passportNumber) {
            const existingPassport = await prisma.studentProfile.findUnique({
                where: { passportNumber: data.passportNumber },
            });

            if (existingPassport) {
                throw new Error('Passport number already registered');
            }
        }

        // Calculate age range if DOB is updated
        let ageRange = profile.ageRange;
        if (data.dateOfBirth) {
            const age = calculateAge(data.dateOfBirth);
            ageRange = getAgeRange(age);
        }

        const updatedData = { ...data, ageRange };

        // Recalculate completeness
        const mergedData = { ...profile, ...updatedData };
        const isComplete = this.checkProfileComplete(mergedData);

        const updatedProfile = await prisma.studentProfile.update({
            where: { userId },
            data: { ...updatedData, isComplete },
            include: {
                county: true,
                subCounty: true,
                ward: true,
            },
        });

        logger.info(`Profile updated for user ${userId}`);
        return updatedProfile;
    }

    /**
     * Check if profile data is complete
     */
    private checkProfileComplete(data: any): boolean {
        const requiredFields = [
            'fullName',
            'dateOfBirth',
            'gender',
            'countyId',
            'subCountyId',
            'wardId',
            'institutionName',
            'institutionType',
            'programmeOrCourse',
            'admissionYear',
        ];

        const hasAllRequired = requiredFields.every(field =>
            data[field] !== null && data[field] !== undefined && data[field] !== ''
        );

        const hasIdentification = !!(data.nationalIdNumber || data.passportNumber);

        return hasAllRequired && hasIdentification;
    }

    // ==================== PROFILE COMPLETENESS ====================

    /**
     * Get profile completeness details
     */
    async getProfileCompleteness(userId: string): Promise<ProfileCompletenessResponse> {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                profileDocuments: true,
            },
        });

        if (!profile) {
            return {
                isComplete: false,
                completenessPercentage: 0,
                missingFields: ['Profile not created'],
                missingDocuments: ['NATIONAL_ID', 'ADMISSION_LETTER'] as ProfileDocumentType[],
                requiredDocuments: ['NATIONAL_ID', 'ADMISSION_LETTER'] as ProfileDocumentType[],
                uploadedDocuments: [],
            };
        }

        const requiredFields = [
            { name: 'fullName', label: 'Full Name' },
            { name: 'dateOfBirth', label: 'Date of Birth' },
            { name: 'gender', label: 'Gender' },
            { name: 'countyId', label: 'County' },
            { name: 'subCountyId', label: 'Sub-County' },
            { name: 'wardId', label: 'Ward' },
            { name: 'institutionName', label: 'Institution Name' },
            { name: 'institutionType', label: 'Education Level' },
            { name: 'programmeOrCourse', label: 'Programme/Course' },
            { name: 'admissionYear', label: 'Admission Year' },
        ];

        const missingFields: string[] = [];
        let filledCount = 0;

        for (const field of requiredFields) {
            const value = (profile as any)[field.name];
            if (value !== null && value !== undefined && value !== '') {
                filledCount++;
            } else {
                missingFields.push(field.label);
            }
        }

        // Check identification
        if (!profile.nationalIdNumber && !profile.passportNumber) {
            missingFields.push('National ID or Passport');
        } else {
            filledCount++;
        }

        // Check required documents
        const requiredDocumentTypes: ProfileDocumentType[] = ['NATIONAL_ID', 'ADMISSION_LETTER'];
        const uploadedDocumentTypes = profile.profileDocuments.map(d => d.documentType);
        const missingDocuments = requiredDocumentTypes.filter(
            docType => !uploadedDocumentTypes.includes(docType)
        );

        // Calculate percentage (fields + documents)
        const totalItems = requiredFields.length + 1 + requiredDocumentTypes.length; // +1 for ID
        const completedItems = filledCount + (requiredDocumentTypes.length - missingDocuments.length);
        const completenessPercentage = Math.round((completedItems / totalItems) * 100);

        return {
            isComplete: missingFields.length === 0 && missingDocuments.length === 0,
            completenessPercentage,
            missingFields,
            missingDocuments,
            requiredDocuments: requiredDocumentTypes,
            uploadedDocuments: uploadedDocumentTypes,
        };
    }

    // ==================== PROFILE DOCUMENTS ====================

    /**
     * Upload profile document
     */
    async uploadProfileDocument(
        userId: string,
        documentType: ProfileDocumentType,
        file: {
            originalname: string;
            filename: string;
            path: string;
            size: number;
            mimetype: string;
        }
    ) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found. Please create a profile first.');
        }

        // Check if document of this type already exists
        const existingDoc = await prisma.profileDocument.findFirst({
            where: {
                studentProfileId: profile.id,
                documentType,
            },
        });

        if (existingDoc) {
            // Update existing document
            const updated = await prisma.profileDocument.update({
                where: { id: existingDoc.id },
                data: {
                    originalFilename: file.originalname,
                    storedFilename: file.filename,
                    filePath: file.path,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    uploadedAt: new Date(),
                    verifiedByAdmin: false,
                    verifiedAt: null,
                    verifiedBy: null,
                },
            });

            logger.info(`Profile document updated: ${documentType} for profile ${profile.id}`);
            return updated;
        }

        // Create new document
        const document = await prisma.profileDocument.create({
            data: {
                studentProfileId: profile.id,
                documentType,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
            },
        });

        // Update profile completeness
        await this.updateProfileCompleteness(userId);

        logger.info(`Profile document created: ${documentType} for profile ${profile.id}`);
        return document;
    }

    /**
     * Get profile documents
     */
    async getProfileDocuments(userId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const documents = await prisma.profileDocument.findMany({
            where: { studentProfileId: profile.id },
            orderBy: { uploadedAt: 'desc' },
        });

        return documents;
    }

    /**
     * Delete profile document
     */
    async deleteProfileDocument(userId: string, documentId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const document = await prisma.profileDocument.findFirst({
            where: {
                id: documentId,
                studentProfileId: profile.id,
            },
        });

        if (!document) {
            throw new Error('Document not found');
        }

        // Check if document is linked to any pending/under_review applications
        const linkedApplications = await prisma.applicationProfileDocumentLink.findMany({
            where: {
                profileDocumentId: documentId,
                application: {
                    status: { in: ['PENDING', 'UNDER_REVIEW'] },
                },
            },
        });

        if (linkedApplications.length > 0) {
            throw new Error('Cannot delete document linked to active applications');
        }

        await prisma.profileDocument.delete({
            where: { id: documentId },
        });

        // Update profile completeness
        await this.updateProfileCompleteness(userId);

        logger.info(`Profile document deleted: ${documentId} for profile ${profile.id}`);
        return { success: true };
    }

    /**
     * Update profile completeness flag
     */
    private async updateProfileCompleteness(userId: string) {
        const completeness = await this.getProfileCompleteness(userId);

        await prisma.studentProfile.update({
            where: { userId },
            data: { isComplete: completeness.isComplete },
        });
    }

    // ==================== APPLICATION ELIGIBILITY ====================

    /**
     * Check if student is eligible to create new application
     */
    async checkEligibility(userId: string): Promise<EligibilityResponse> {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                profileDocuments: true,
            },
        });

        if (!profile) {
            return {
                canApply: false,
                reason: 'Profile not found. Please create a profile first.',
                profileCompleteness: 0,
                missingFields: ['Profile not created'],
                hasActiveApplication: false,
            };
        }

        // Check profile completeness
        const completeness = await this.getProfileCompleteness(userId);

        if (!completeness.isComplete) {
            return {
                canApply: false,
                reason: 'Profile is incomplete. Please complete all required fields and upload required documents.',
                profileCompleteness: completeness.completenessPercentage,
                missingFields: [...completeness.missingFields, ...completeness.missingDocuments],
                hasActiveApplication: false,
            };
        }

        // Check for active application
        const activeApplication = await prisma.application.findFirst({
            where: {
                studentProfileId: profile.id,
                status: { in: ACTIVE_APPLICATION_STATUSES },
            },
            select: { id: true, status: true },
        });

        if (activeApplication) {
            return {
                canApply: false,
                reason: `You already have an active application in ${activeApplication.status} status.`,
                profileCompleteness: completeness.completenessPercentage,
                missingFields: [],
                hasActiveApplication: true,
                activeApplicationId: activeApplication.id,
                activeApplicationStatus: activeApplication.status,
            };
        }

        return {
            canApply: true,
            reason: 'You are eligible to submit a new application.',
            profileCompleteness: completeness.completenessPercentage,
            missingFields: [],
            hasActiveApplication: false,
        };
    }

    // ==================== APPLICATION DRAFT ====================

    /**
     * Create a new draft application
     */
    async createDraft(userId: string, data: CreateDraftRequest) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                county: true,
                subCounty: true,
                ward: true,
                user: { select: { email: true, phone: true } },
            },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Check eligibility first
        const eligibility = await this.checkEligibility(userId);
        if (!eligibility.canApply) {
            throw new Error(eligibility.reason);
        }

        // Generate application number
        const applicationCount = await prisma.application.count();
        const applicationNumber = generateApplicationNumber(applicationCount + 1);

        // Create draft application
        const application = await prisma.$transaction(async (tx) => {
            const app = await tx.application.create({
                data: {
                    applicationNumber,
                    studentProfileId: profile.id,
                    status: ApplicationStatus.DRAFT,
                    outstandingFeesBalance: data.outstandingFeesBalance,
                    hardshipNarrative: data.hardshipNarrative,
                    currentYearOfStudy: data.currentYearOfStudy,
                    modeOfSponsorship: data.modeOfSponsorship,
                    howSupportingEducation: data.howSupportingEducation || [],
                    currentFeeSituation: data.currentFeeSituation,
                    isFeesAffectingStudies: data.isFeesAffectingStudies || false,
                    hasBeenSentHome: data.hasBeenSentHome || false,
                    hasMissedExamsOrClasses: data.hasMissedExamsOrClasses || false,
                    difficultiesFaced: data.difficultiesFaced || [],
                    goalForAcademicYear: data.goalForAcademicYear,
                    referralSource: data.referralSource,
                },
            });

            // Create initial status history
            await tx.applicationStatusHistory.create({
                data: {
                    applicationId: app.id,
                    previousStatus: null,
                    newStatus: ApplicationStatus.DRAFT,
                    changedBy: userId,
                    reason: 'Application draft created',
                    autoGenerated: true,
                },
            });

            return app;
        });

        logger.info(`Draft application created: ${applicationNumber} for user ${userId}`);
        return application;
    }

    /**
     * Update draft application
     */
    async updateDraft(userId: string, applicationId: string, data: Partial<UpdateDraftRequest>) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.status !== ApplicationStatus.DRAFT) {
            throw new Error('Only draft applications can be updated');
        }

        const updated = await prisma.application.update({
            where: { id: applicationId },
            data: {
                ...data,
                outstandingFeesBalance: data.outstandingFeesBalance
                    ? new Prisma.Decimal(data.outstandingFeesBalance)
                    : undefined,
            },
        });

        logger.info(`Draft application updated: ${applicationId}`);
        return updated;
    }

    /**
     * Get active application
     */
    async getActiveApplication(userId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            return null;
        }

        const application = await prisma.application.findFirst({
            where: {
                studentProfileId: profile.id,
                status: { in: ACTIVE_APPLICATION_STATUSES },
            },
            include: {
                applicationDocuments: true,
                profileDocumentLinks: {
                    include: { profileDocument: true },
                },
                statusHistory: {
                    orderBy: { changedAt: 'desc' },
                    take: 5,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return application;
    }

    // ==================== APPLICATION DOCUMENTS ====================

    /**
     * Upload application document
     */
    async uploadApplicationDocument(
        userId: string,
        applicationId: string,
        documentType: ApplicationDocumentType,
        file: {
            originalname: string;
            filename: string;
            path: string;
            size: number;
            mimetype: string;
        }
    ) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.status !== ApplicationStatus.DRAFT) {
            throw new Error('Can only upload documents to draft applications');
        }

        const document = await prisma.applicationDocument.create({
            data: {
                applicationId,
                documentType,
                originalFilename: file.originalname,
                storedFilename: file.filename,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
            },
        });

        logger.info(`Application document created: ${documentType} for application ${applicationId}`);
        return document;
    }

    /**
     * Get application documents
     */
    async getApplicationDocuments(userId: string, applicationId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        const documents = await prisma.applicationDocument.findMany({
            where: { applicationId },
            orderBy: { uploadedAt: 'desc' },
        });

        return documents;
    }

    /**
     * Link profile document to application
     */
    async linkProfileDocument(userId: string, applicationId: string, profileDocumentId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.status !== ApplicationStatus.DRAFT) {
            throw new Error('Can only link documents to draft applications');
        }

        // Verify profile document belongs to this student
        const profileDocument = await prisma.profileDocument.findFirst({
            where: {
                id: profileDocumentId,
                studentProfileId: profile.id,
            },
        });

        if (!profileDocument) {
            throw new Error('Profile document not found');
        }

        // Check if already linked
        const existingLink = await prisma.applicationProfileDocumentLink.findUnique({
            where: {
                applicationId_profileDocumentId: {
                    applicationId,
                    profileDocumentId,
                },
            },
        });

        if (existingLink) {
            throw new Error('Document already linked to this application');
        }

        const link = await prisma.applicationProfileDocumentLink.create({
            data: {
                applicationId,
                profileDocumentId,
            },
            include: {
                profileDocument: true,
            },
        });

        logger.info(`Profile document ${profileDocumentId} linked to application ${applicationId}`);
        return link;
    }

    // ==================== APPLICATION SUBMISSION ====================

    /**
     * Submit application (DRAFT -> PENDING with snapshot)
     */
    async submitApplication(userId: string, applicationId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
            include: {
                county: true,
                subCounty: true,
                ward: true,
                user: { select: { email: true, phone: true } },
            },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
            include: {
                applicationDocuments: true,
                profileDocumentLinks: true,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.status !== ApplicationStatus.DRAFT) {
            throw new Error('Only draft applications can be submitted');
        }

        // Validate minimum required documents
        const hasRequiredDocs = application.applicationDocuments.some(
            d => d.documentType === 'FEE_STRUCTURE'
        );

        if (!hasRequiredDocs) {
            throw new Error('Please upload the current fee structure document before submitting');
        }

        // Create snapshot and submit
        const submittedApplication = await prisma.$transaction(async (tx) => {
            const updated = await tx.application.update({
                where: { id: applicationId },
                data: {
                    status: ApplicationStatus.PENDING,
                    submittedAt: new Date(),
                    // Snapshot profile data
                    snapshotFullName: profile.fullName,
                    snapshotDateOfBirth: profile.dateOfBirth,
                    snapshotGender: profile.gender,
                    snapshotNationalId: profile.nationalIdNumber,
                    snapshotPassportNumber: profile.passportNumber,
                    snapshotInstitution: profile.institutionName,
                    snapshotProgramme: profile.programmeOrCourse,
                    snapshotCounty: profile.county.name,
                    snapshotSubCounty: profile.subCounty.name,
                    snapshotWard: profile.ward.name,
                    snapshotPhone: profile.user.phone,
                    snapshotEmail: profile.user.email,
                    snapshotEducationLevel: profile.institutionType,
                },
            });

            // Create status history
            await tx.applicationStatusHistory.create({
                data: {
                    applicationId,
                    previousStatus: ApplicationStatus.DRAFT,
                    newStatus: ApplicationStatus.PENDING,
                    changedBy: userId,
                    reason: 'Application submitted for review',
                    autoGenerated: true,
                },
            });

            return updated;
        });

        logger.info(`Application submitted: ${application.applicationNumber} for user ${userId}`);
        return submittedApplication;
    }

    // ==================== APPLICATION HISTORY ====================

    /**
     * Get student's applications
     */
    async getApplications(userId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const applications = await prisma.application.findMany({
            where: { studentProfileId: profile.id },
            orderBy: { createdAt: 'desc' },
            include: {
                applicationDocuments: true,
                profileDocumentLinks: {
                    include: { profileDocument: true },
                },
                statusHistory: {
                    orderBy: { changedAt: 'desc' },
                    take: 1,
                },
            },
        });

        return applications;
    }

    /**
     * Get single application
     */
    async getApplication(userId: string, applicationId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
            include: {
                applicationDocuments: true,
                profileDocumentLinks: {
                    include: { profileDocument: true },
                },
                statusHistory: {
                    orderBy: { changedAt: 'desc' },
                },
                adminNotes: {
                    where: { isPrivate: false, deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        return application;
    }

    /**
     * Get application status history
     */
    async getApplicationHistory(userId: string, applicationId: string) {
        const profile = await prisma.studentProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const application = await prisma.application.findFirst({
            where: {
                id: applicationId,
                studentProfileId: profile.id,
            },
        });

        if (!application) {
            throw new Error('Application not found');
        }

        const history = await prisma.applicationStatusHistory.findMany({
            where: { applicationId },
            orderBy: { changedAt: 'desc' },
        });

        return history;
    }
}

export default new StudentService();
