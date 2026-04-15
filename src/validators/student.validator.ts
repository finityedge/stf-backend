import { z } from 'zod';
import { EducationLevel, ProfileDocumentType, ApplicationDocumentType, HouseholdIncomeRange, OrphanStatus, WhoLivesWith } from '@prisma/client';
import {
    validateKenyanPhone,
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
        institutionName: z.string().min(2, 'Institution name is required').max(200).optional(),
        institutionType: z.nativeEnum(EducationLevel).optional(),
        programmeOrCourse: z.string().min(2, 'Programme/course is required').max(200).optional(),
        admissionYear: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
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
        formData: z.record(z.string(), z.any()).optional().default({}),
    }).catchall(z.any()),
});

export const updateDraftSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        formData: z.record(z.string(), z.any()).optional(),
    }).catchall(z.any()),
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
