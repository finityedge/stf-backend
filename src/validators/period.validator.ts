import { z } from 'zod';

// ==================== APPLICATION PERIOD SCHEMAS ====================

export const createPeriodSchema = z.object({
    body: z.object({
        title: z.string().min(3, 'Title must be at least 3 characters').max(100),
        academicYear: z.string().regex(/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g. 2025/26)'),
        startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
        endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
        description: z.string().max(500).optional(),
    }).refine(
        (data) => new Date(data.startDate) < new Date(data.endDate),
        { message: 'Start date must be before end date', path: ['endDate'] }
    ),
});

export const updatePeriodSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid period ID'),
    }),
    body: z.object({
        title: z.string().min(3).max(100).optional(),
        academicYear: z.string().regex(/^\d{4}\/\d{2}$/).optional(),
        startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date').optional(),
        endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional(),
        description: z.string().max(500).optional(),
    }),
});

export const getPeriodSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid period ID'),
    }),
});

export const activatePeriodSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid period ID'),
    }),
});
