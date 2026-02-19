import { z } from 'zod';
import { EducationLevel, ProfileDocumentType, ApplicationDocumentType, HouseholdIncomeRange, OrphanStatus, WhoLivesWith } from '@prisma/client';
import {
    validateKenyanPhone,
    countWords,
    validateFeeBalance
} from '../utils/validators';

// ==================== PROFILE SCHEMAS ====================

export const createProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
        dateOfBirth: z.string().refine(
            (val) => !isNaN(Date.parse(val)),
            { message: 'Invalid date format. Use ISO date format (YYYY-MM-DD)' }
        ),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
            errorMap: () => ({ message: 'Gender must be MALE, FEMALE, or OTHER' })
        }),
        nationalIdNumber: z.string().optional(),
        passportNumber: z.string().transform(val => val === '' ? undefined : val).pipe(z.string().min(6).max(20).optional()),
        countyId: z.string().uuid('Invalid county ID'),
        subCountyId: z.string().uuid('Invalid sub-county ID'),
        wardId: z.string().uuid('Invalid ward ID'),
        currentResidence: z.string().max(200).optional(),
        institutionName: z.string().min(2, 'Institution name is required').max(200),
        institutionType: z.nativeEnum(EducationLevel),
        programmeOrCourse: z.string().min(2, 'Programme/course is required').max(200),
        admissionYear: z.number().int().min(2000).max(new Date().getFullYear() + 1),
        institutionId: z.string().uuid('Invalid institution ID').optional(),

        // Family & Guardian
        whoLivesWith: z.nativeEnum(WhoLivesWith).optional(),
        whoLivesWithOther: z.string().max(200).optional(),
        guardianName: z.string().max(100).optional(),
        guardianPhone: z.string().max(20).optional(),
        guardianOccupation: z.string().max(200).optional(),
        householdIncomeRange: z.nativeEnum(HouseholdIncomeRange).optional(),
        numberOfDependents: z.number().int().min(0).max(50).optional(),
        numberOfSiblings: z.number().int().min(0).max(30).optional(),
        siblingsInSchool: z.number().int().min(0).max(30).optional(),

        // Contact
        phoneNumber: z.string().max(20).optional(),
        emergencyContactName: z.string().max(100).optional(),
        emergencyContactPhone: z.string().max(20).optional(),

        // Vulnerability & Background
        orphanStatus: z.nativeEnum(OrphanStatus).optional(),
        disabilityStatus: z.boolean().optional().default(false),
        disabilityType: z.string().max(200).optional(),
        kcseGrade: z.string().max(10).optional(),
        previousScholarship: z.boolean().optional().default(false),
        previousScholarshipDetails: z.string().max(500).optional(),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).max(100).optional(),
        dateOfBirth: z.string().refine(
            (val) => !val || !isNaN(Date.parse(val)),
            { message: 'Invalid date format. Use ISO date format (YYYY-MM-DD)' }
        ).optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        nationalIdNumber: z.string().optional(),
        passportNumber: z.string().transform(val => val === '' ? undefined : val).pipe(z.string().min(6).max(20).optional()),
        countyId: z.string().uuid().optional(),
        subCountyId: z.string().uuid().optional(),
        wardId: z.string().uuid().optional(),
        currentResidence: z.string().max(200).optional(),
        institutionName: z.string().min(2).max(200).optional(),
        institutionType: z.nativeEnum(EducationLevel).optional(),
        programmeOrCourse: z.string().min(2).max(200).optional(),
        admissionYear: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
        institutionId: z.string().uuid().optional(),

        // Family & Guardian
        whoLivesWith: z.nativeEnum(WhoLivesWith).optional(),
        whoLivesWithOther: z.string().max(200).optional(),
        guardianName: z.string().max(100).optional(),
        guardianPhone: z.string().max(20).optional(),
        guardianOccupation: z.string().max(200).optional(),
        householdIncomeRange: z.nativeEnum(HouseholdIncomeRange).optional(),
        numberOfDependents: z.number().int().min(0).max(50).optional(),
        numberOfSiblings: z.number().int().min(0).max(30).optional(),
        siblingsInSchool: z.number().int().min(0).max(30).optional(),

        // Contact
        phoneNumber: z.string().max(20).optional(),
        emergencyContactName: z.string().max(100).optional(),
        emergencyContactPhone: z.string().max(20).optional(),

        // Vulnerability & Background
        orphanStatus: z.nativeEnum(OrphanStatus).optional(),
        disabilityStatus: z.boolean().optional(),
        disabilityType: z.string().max(200).optional(),
        kcseGrade: z.string().max(10).optional(),
        previousScholarship: z.boolean().optional(),
        previousScholarshipDetails: z.string().max(500).optional(),
    }),
});

// ==================== PROFILE DOCUMENT SCHEMAS ====================

export const uploadProfileDocumentSchema = z.object({
    body: z.object({
        documentType: z.nativeEnum(ProfileDocumentType, {
            errorMap: () => ({ message: 'Invalid document type. Allowed: NATIONAL_ID, PASSPORT, KCSE_CERT, ADMISSION_LETTER, STUDENT_ID, TRANSCRIPT' })
        }),
    }),
});

export const deleteProfileDocumentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid document ID'),
    }),
});

// ==================== APPLICATION DRAFT SCHEMAS ====================

export const createDraftSchema = z.object({
    body: z.object({
        outstandingFeesBalance: z.number().positive('Outstanding fees must be positive').refine(
            (val) => validateFeeBalance(val),
            { message: 'Fee balance must be between 1,000 and 10,000,000 KES' }
        ),
        hardshipNarrative: z.string().min(10).refine(
            (val) => {
                const wordCount = countWords(val);
                return wordCount >= 50 && wordCount <= 120;
            },
            { message: 'Hardship narrative must be between 50 and 120 words' }
        ),
        currentYearOfStudy: z.string().min(1, 'Year of study is required'),
        modeOfSponsorship: z.array(z.string()).min(1, 'At least one mode of sponsorship is required'),
        howSupportingEducation: z.array(z.string()).optional().default([]),
        currentFeeSituation: z.string().max(500).optional(),
        isFeesAffectingStudies: z.boolean().optional().default(false),
        hasBeenSentHome: z.boolean().optional().default(false),
        hasMissedExamsOrClasses: z.boolean().optional().default(false),
        difficultiesFaced: z.array(z.string()).optional().default([]),
        goalForAcademicYear: z.string().max(1000).optional(),
        referralSource: z.string().max(200).optional(),

        // Enhanced fields (Phase 2)
        gpa: z.string().max(10).optional(),
        expectedGraduationDate: z.string().refine(
            (val) => !isNaN(Date.parse(val)),
            { message: 'Invalid date format' }
        ).optional(),
        totalAnnualFeeAmount: z.number().positive().optional(),
        remainingSemesters: z.number().int().min(1).max(20).optional(),
        appliedToOtherScholarships: z.boolean().optional().default(false),
        otherScholarshipsDetails: z.string().max(500).optional(),
        communityInvolvement: z.string().max(2000).optional(),
        careerAspirations: z.string().max(2000).optional(),
        givingBackPlan: z.string().max(2000).optional(),
    }),
});

export const updateDraftSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        outstandingFeesBalance: z.number().positive().refine(
            (val) => validateFeeBalance(val),
            { message: 'Fee balance must be between 1,000 and 10,000,000 KES' }
        ).optional(),
        hardshipNarrative: z.string().min(10).refine(
            (val) => {
                const wordCount = countWords(val);
                return wordCount >= 50 && wordCount <= 120;
            },
            { message: 'Hardship narrative must be between 50 and 120 words' }
        ).optional(),
        currentYearOfStudy: z.string().min(1).optional(),
        modeOfSponsorship: z.array(z.string()).min(1).optional(),
        howSupportingEducation: z.array(z.string()).optional(),
        currentFeeSituation: z.string().max(500).optional(),
        isFeesAffectingStudies: z.boolean().optional(),
        hasBeenSentHome: z.boolean().optional(),
        hasMissedExamsOrClasses: z.boolean().optional(),
        difficultiesFaced: z.array(z.string()).optional(),
        goalForAcademicYear: z.string().max(1000).optional(),
        referralSource: z.string().max(200).optional(),

        // Enhanced fields (Phase 2)
        gpa: z.string().max(10).optional(),
        expectedGraduationDate: z.string().refine(
            (val) => !isNaN(Date.parse(val)),
            { message: 'Invalid date format' }
        ).optional(),
        totalAnnualFeeAmount: z.number().positive().optional(),
        remainingSemesters: z.number().int().min(1).max(20).optional(),
        appliedToOtherScholarships: z.boolean().optional(),
        otherScholarshipsDetails: z.string().max(500).optional(),
        communityInvolvement: z.string().max(2000).optional(),
        careerAspirations: z.string().max(2000).optional(),
        givingBackPlan: z.string().max(2000).optional(),
    }),
});

// ==================== APPLICATION DOCUMENT SCHEMAS ====================

export const uploadApplicationDocumentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        documentType: z.nativeEnum(ApplicationDocumentType, {
            errorMap: () => ({ message: 'Invalid document type. Allowed: FEE_STRUCTURE, BALANCE_STATEMENT, SUPPORT_LETTER, OTHER_EVIDENCE' })
        }),
    }),
});

export const linkProfileDocumentSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        profileDocumentId: z.string().uuid('Invalid profile document ID'),
    }),
});

// ==================== APPLICATION SUBMISSION SCHEMA ====================

export const submitApplicationSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
});

// ==================== APPLICATION VIEW SCHEMAS ====================

export const getApplicationSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
});

// ==================== PHONE VALIDATION SCHEMA ====================

export const phoneSchema = z.string().refine(
    (val) => validateKenyanPhone(val),
    { message: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 01XXXXXXXX' }
);
