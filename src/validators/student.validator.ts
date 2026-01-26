import { z } from 'zod';
import { EducationLevel, ProfileDocumentType, ApplicationDocumentType } from '@prisma/client';
import {
    validateKenyanNationalId,
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
        nationalIdNumber: z.string().optional().refine(
            (val) => !val || validateKenyanNationalId(val),
            { message: 'Invalid Kenyan National ID format. Must be exactly 8 digits.' }
        ),
        passportNumber: z.string().min(6).max(20).optional(),
        countyId: z.string().uuid('Invalid county ID'),
        subCountyId: z.string().uuid('Invalid sub-county ID'),
        wardId: z.string().uuid('Invalid ward ID'),
        currentResidence: z.string().max(200).optional(),
        institutionName: z.string().min(2, 'Institution name is required').max(200),
        institutionType: z.nativeEnum(EducationLevel),
        programmeOrCourse: z.string().min(2, 'Programme/course is required').max(200),
        admissionYear: z.number().int().min(2000).max(new Date().getFullYear() + 1),
        whoLivesWith: z.string().max(500).optional(),
    }).refine(
        (data) => data.nationalIdNumber || data.passportNumber,
        { message: 'Either National ID or Passport Number is required', path: ['nationalIdNumber'] }
    ),
});

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z.string().min(2).max(100).optional(),
        dateOfBirth: z.string().refine(
            (val) => !val || !isNaN(Date.parse(val)),
            { message: 'Invalid date format. Use ISO date format (YYYY-MM-DD)' }
        ).optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        nationalIdNumber: z.string().optional().refine(
            (val) => !val || validateKenyanNationalId(val),
            { message: 'Invalid Kenyan National ID format. Must be exactly 8 digits.' }
        ),
        passportNumber: z.string().min(6).max(20).optional(),
        countyId: z.string().uuid().optional(),
        subCountyId: z.string().uuid().optional(),
        wardId: z.string().uuid().optional(),
        currentResidence: z.string().max(200).optional(),
        institutionName: z.string().min(2).max(200).optional(),
        institutionType: z.nativeEnum(EducationLevel).optional(),
        programmeOrCourse: z.string().min(2).max(200).optional(),
        admissionYear: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
        whoLivesWith: z.string().max(500).optional(),
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
