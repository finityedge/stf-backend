import { z } from 'zod';
import { validateKenyanPhone, normalizeKenyanPhone } from '../utils/validators';

// ==================== PASSWORD VALIDATION ====================

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

// ==================== REGISTER SCHEMA ====================

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format').toLowerCase(),
        phone: z.string().refine(
            (val) => validateKenyanPhone(val),
            { message: 'Invalid Kenyan phone number format. Use 07XXXXXXXX or 01XXXXXXXX' }
        ).transform((val) => normalizeKenyanPhone(val)),
        password: passwordSchema,
        consentVersion: z.string().min(1, 'Consent version is required'),
    }),
});

// ==================== LOGIN SCHEMA ====================

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format').toLowerCase(),
        password: z.string().min(1, 'Password is required'),
    }),
});

// ==================== REFRESH TOKEN SCHEMA ====================

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});

// ==================== PASSWORD RESET SCHEMAS ====================

export const requestPasswordResetSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format').toLowerCase(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Reset token is required'),
        newPassword: passwordSchema,
    }),
});

// ==================== CHANGE PASSWORD SCHEMA ====================

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema,
    }),
});

// ==================== LOGOUT SCHEMA ====================

export const logoutSchema = z.object({
    body: z.object({
        refreshToken: z.string().optional(),
    }),
});
