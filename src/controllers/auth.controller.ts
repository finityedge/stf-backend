import { Request, Response } from 'express';
import authService from '../services/auth.service';
import logger from '../config/logger';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new student user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *               - consentVersion
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               consentVersion:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, phone, password, consentVersion } = req.body;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

        const result = await authService.register(email, phone, password, consentVersion, ipAddress);

        logger.info('User registered successfully', { userId: result.user.id, email });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: result.user,
                tokens: result.tokens,
            },
        });
    } catch (error: any) {
        logger.error('Registration error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Registration failed',
        });
    }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        logger.info('User logged in successfully', { userId: result.user.id, email });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                tokens: result.tokens,
            },
        });
    } catch (error: any) {
        logger.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Login failed',
        });
    }
};

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        const tokens = await authService.refreshToken(refreshToken);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens,
        });
    } catch (error: any) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Token refresh failed',
        });
    }
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (user) {
            await authService.logout(user.id);
            logger.info('User logged out', { userId: user.id });
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error: any) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
        });
    }
};

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = (req as any).user!.id;

        await authService.changePassword(userId, oldPassword, newPassword);

        logger.info('Password changed successfully', { userId });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error: any) {
        logger.error('Change password error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Password change failed',
        });
    }
};

/**
 * @swagger
 * /api/auth/request-password-reset:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        const message = await authService.requestPasswordReset(email);

        res.status(200).json({
            success: true,
            message,
        });
    } catch (error: any) {
        logger.error('Request password reset error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to request password reset',
        });
    }
};

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token, newPassword } = req.body;

        await authService.resetPassword(token, newPassword);

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.',
        });
    } catch (error: any) {
        logger.error('Reset password error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Password reset failed',
        });
    }
};
