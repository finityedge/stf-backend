import { z } from 'zod';
import { ApplicationStatus, EducationLevel } from '@prisma/client';


// ==================== APPLICATION LIST SCHEMA ====================

export const listApplicationsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => {
            const parsed = val ? parseInt(val) : 20;
            return Math.min(parsed, 100); // Max 100 items per page
        }),
        status: z.string().optional().transform((val) => {
            if (!val) return undefined;
            // Support comma-separated statuses
            const statuses = val.split(',').map(s => s.trim().toUpperCase());
            return statuses as ApplicationStatus[];
        }),
        educationLevel: z.nativeEnum(EducationLevel).optional(),
        county: z.string().optional(),
        minBalance: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
        maxBalance: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
        submittedAfter: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        submittedBefore: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        hasBeenSentHome: z.string().optional().transform((val) => val === 'true'),
        search: z.string().optional(),
        sortBy: z.enum([
            'submittedAt',
            'outstandingFeesBalance',
            'status',
            'snapshotFullName',
            'snapshotInstitution',
            'createdAt'
        ]).optional().default('submittedAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    }),
});

// ==================== STATUS UPDATE SCHEMA ====================

export const updateApplicationStatusSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        status: z.nativeEnum(ApplicationStatus),
        notes: z.string().max(1000).optional(),
        disbursedAmount: z.number().positive().optional(),
    }),
});

// ==================== BULK UPDATE SCHEMA ====================

export const bulkUpdateSchema = z.object({
    body: z.object({
        applicationIds: z.array(z.string().uuid()).min(1, 'At least one application ID is required').max(100, 'Maximum 100 applications per batch'),
        newStatus: z.nativeEnum(ApplicationStatus),
        note: z.string().max(500).optional(),
    }),
});

// ==================== GET APPLICATION SCHEMA ====================

export const getApplicationSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
});

// ==================== STUDENT CONTEXT SCHEMAS ====================

export const getStudentSchema = z.object({
    params: z.object({
        profileId: z.string().uuid('Invalid profile ID'),
    }),
});

export const searchStudentsSchema = z.object({
    query: z.object({
        q: z.string().min(1, 'Search query is required'),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

// ==================== NOTES SCHEMAS ====================

export const addNoteSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        noteText: z.string().min(1, 'Note content is required').max(5000),
        isPrivate: z.boolean().optional().default(true),
        section: z.enum(['financial', 'academic', 'vulnerability', 'general']).optional(),
    }),
});

export const updateNoteSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
        noteId: z.string().uuid('Invalid note ID'),
    }),
    body: z.object({
        noteText: z.string().min(1, 'Note content is required').max(5000),
    }),
});

export const deleteNoteSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
        noteId: z.string().uuid('Invalid note ID'),
    }),
});

// ==================== EXPORT SCHEMA ====================

export const exportApplicationsSchema = z.object({
    query: z.object({
        status: z.string().optional().transform((val) => {
            if (!val) return undefined;
            const statuses = val.split(',').map(s => s.trim().toUpperCase());
            return statuses as ApplicationStatus[];
        }),
        educationLevel: z.nativeEnum(EducationLevel).optional(),
        county: z.string().optional(),
        minBalance: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
        maxBalance: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
        submittedAfter: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        submittedBefore: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    }),
});

// ==================== ANALYTICS FILTER SCHEMA ====================

export const analyticsFilterSchema = z.object({
    query: z.object({
        startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
        endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    }),
});

// ==================== SCORING SCHEMA ====================

export const scoreApplicationSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid application ID'),
    }),
    body: z.object({
        financialNeed: z.number().int().min(1).max(5),
        academicMerit: z.number().int().min(1).max(5),
        communityImpact: z.number().int().min(1).max(5),
        vulnerability: z.number().int().min(1).max(5),
        comments: z.string().max(2000).optional(),
    }),
});
