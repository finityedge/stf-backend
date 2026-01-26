import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    changePasswordSchema,
    logoutSchema,
    requestPasswordResetSchema,
    resetPasswordSchema
} from '../validators/auth.validator';

const router = Router();

// Registration
router.post(
    '/register',
    validate(registerSchema),
    authController.register
);

// Login
router.post(
    '/login',
    validate(loginSchema),
    authController.login
);

// Refresh Token
router.post(
    '/refresh',
    validate(refreshTokenSchema),
    authController.refreshToken
);

// Logout
router.post(
    '/logout',
    authenticate,
    validate(logoutSchema),
    authController.logout
);

// Password Management
router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);

router.post(
    '/request-password-reset',
    validate(requestPasswordResetSchema),
    authController.requestPasswordReset
);

router.post(
    '/reset-password',
    validate(resetPasswordSchema),
    authController.resetPassword
);

export default router;
