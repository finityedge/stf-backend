import { ApplicationStatus, EducationLevel, ProfileDocumentType, ApplicationDocumentType, HouseholdIncomeRange, OrphanStatus, WhoLivesWith } from '@prisma/client';

// ==================== GENERIC API RESPONSES ====================

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    timestamp: string;
    requestId?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Array<{
            field: string;
            issue: string;
        }>;
    };
    timestamp: string;
    requestId?: string;
}

// Error codes enum
export enum ErrorCode {
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
    APPLICATION_NOT_ELIGIBLE = 'APPLICATION_NOT_ELIGIBLE',
    INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
    FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// ==================== PAGINATION ====================

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    timestamp: string;
}

// ==================== FILTER PARAMS ====================

export interface ApplicationFilterParams extends PaginationParams {
    status?: ApplicationStatus | ApplicationStatus[];
    educationLevel?: EducationLevel;
    county?: string;
    minBalance?: number;
    maxBalance?: number;
    submittedAfter?: Date;
    submittedBefore?: Date;
    hasBeenSentHome?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ==================== ELIGIBILITY ====================

export interface EligibilityResponse {
    canApply: boolean;
    reason: string;
    profileCompleteness: number;
    missingFields: string[];
    hasActiveApplication: boolean;
    activeApplicationId?: string;
    activeApplicationStatus?: ApplicationStatus;
}

// ==================== PROFILE COMPLETENESS ====================

export interface ProfileCompletenessResponse {
    isComplete: boolean;
    completenessPercentage: number;
    missingFields: string[];
    missingDocuments: ProfileDocumentType[];
    requiredDocuments: ProfileDocumentType[];
    uploadedDocuments: ProfileDocumentType[];
}

// ==================== APPLICATION DRAFT ====================

export interface CreateDraftRequest {
    outstandingFeesBalance: number;
    hardshipNarrative: string;
    currentYearOfStudy: string;
    modeOfSponsorship: string[];
    howSupportingEducation?: string[];
    currentFeeSituation?: string;
    isFeesAffectingStudies?: boolean;
    hasBeenSentHome?: boolean;
    hasMissedExamsOrClasses?: boolean;
    difficultiesFaced?: string[];
    goalForAcademicYear?: string;
    referralSource?: string;
    gpa?: string;
    expectedGraduationDate?: string;
    totalAnnualFeeAmount?: number;
    remainingSemesters?: number;
    appliedToOtherScholarships?: boolean;
    otherScholarshipsDetails?: string;
    communityInvolvement?: string;
    careerAspirations?: string;
    givingBackPlan?: string;
}

export interface UpdateDraftRequest extends Partial<CreateDraftRequest> { }

// ==================== PROFILE UPDATE ====================

export interface UpdateProfileRequest {
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    nationalIdNumber?: string;
    passportNumber?: string;
    countyId?: string;
    subCountyId?: string;
    wardId?: string;
    currentResidence?: string;
    institutionName?: string;
    institutionType?: EducationLevel;
    programmeOrCourse?: string;
    admissionYear?: number;
    institutionId?: string;
    whoLivesWith?: WhoLivesWith;
    whoLivesWithOther?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianOccupation?: string;
    householdIncomeRange?: HouseholdIncomeRange;
    numberOfDependents?: number;
    numberOfSiblings?: number;
    siblingsInSchool?: number;
    phoneNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    orphanStatus?: OrphanStatus;
    disabilityStatus?: boolean;
    disabilityType?: string;
    kcseGrade?: string;
    previousScholarship?: boolean;
    previousScholarshipDetails?: string;
}

export interface CreateProfileRequest {
    fullName: string;
    dateOfBirth: string;
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
    institutionId?: string;
    whoLivesWith?: WhoLivesWith;
    whoLivesWithOther?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianOccupation?: string;
    householdIncomeRange?: HouseholdIncomeRange;
    numberOfDependents?: number;
    numberOfSiblings?: number;
    siblingsInSchool?: number;
    phoneNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    orphanStatus?: OrphanStatus;
    disabilityStatus?: boolean;
    disabilityType?: string;
    kcseGrade?: string;
    previousScholarship?: boolean;
    previousScholarshipDetails?: string;
}

// ==================== DOCUMENT UPLOAD ====================

export interface DocumentUploadResponse {
    id: string;
    documentType: ProfileDocumentType | ApplicationDocumentType;
    originalFilename: string;
    storedFilename: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
}

// ==================== ADMIN OPERATIONS ====================

export interface BulkUpdateRequest {
    applicationIds: string[];
    newStatus: ApplicationStatus;
    note?: string;
}

export interface BulkUpdateResponse {
    success: boolean;
    updated: number;
    failed: number;
    errors: Array<{
        applicationId: string;
        error: string;
    }>;
}

export interface StatusUpdateRequest {
    status: ApplicationStatus;
    notes?: string;
}

// ==================== ANALYTICS ====================

export interface AnalyticsSummary {
    totalApplications: number;
    byStatus: Record<ApplicationStatus, number>;
    totalDisbursed: number;
    averageFeeBalance: number;
    applicationsTrend: {
        period: string;
        count: number;
    }[];
}

export interface CountyAnalytics {
    countyName: string;
    countyId: string;
    totalApplications: number;
    pending: number;
    approved: number;
    rejected: number;
    disbursed: number;
    totalDisbursedAmount: number;
}

export interface InstitutionAnalytics {
    institutionName: string;
    institutionType: EducationLevel;
    totalApplications: number;
    approved: number;
    totalDisbursedAmount: number;
}

export interface DisbursementAnalytics {
    totalDisbursed: number;
    totalBeneficiaries: number;
    averageDisbursement: number;
    byMonth: {
        month: string;
        amount: number;
        count: number;
    }[];
    byEducationLevel: Record<EducationLevel, {
        amount: number;
        count: number;
    }>;
}

// ==================== STUDENT TIMELINE ====================

export interface TimelineEvent {
    type: 'APPLICATION_CREATED' | 'APPLICATION_SUBMITTED' | 'STATUS_CHANGED' | 'DOCUMENT_UPLOADED' | 'NOTE_ADDED' | 'PROFILE_UPDATED';
    timestamp: string;
    description: string;
    metadata?: Record<string, any>;
}

// ==================== APPLICATION STATE MACHINE ====================

export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    DRAFT: ['PENDING'],
    PENDING: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['DISBURSED'],
    REJECTED: [],
    DISBURSED: [],
};

export function isValidStatusTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
    return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ==================== ACTIVE STATUSES ====================

export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
    'DRAFT',
    'PENDING',
    'UNDER_REVIEW',
];
