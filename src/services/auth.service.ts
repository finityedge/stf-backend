import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import { JwtPayload, TokenResponse } from '../types/auth.types';
import logger from '../config/logger';

const SALT_ROUNDS = 12;

export class AuthService {
    /**
     * Register a new student user
     */
    async register(
        email: string,
        phone: string,
        password: string,
        consentVersion: string,
        ipAddress: string
    ): Promise<{ user: any; tokens: TokenResponse }> {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }],
            },
        });

        if (existingUser) {
            throw new Error('User with this email or phone already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user and consent log in a transaction
        const user = await prisma.$transaction(async (tx: any) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    role: UserRole.STUDENT,
                },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true,
                },
            });

            // Log consent
            await tx.dataConsentLog.create({
                data: {
                    userId: newUser.id,
                    ipAddress,
                    consentVersion,
                },
            });

            return newUser;
        });

        // Generate tokens
        const tokens = this.generateTokens(user.id, user.email, user.role);

        logger.info(`New user registered: ${email}`);

        return { user, tokens };
    }

    /**
     * Login user
     */
    async login(email: string, password: string): Promise<{ user: any; tokens: TokenResponse }> {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                phone: true,
                password: true,
                role: true,
                isActive: true,
                deletedAt: true,
            },
        });

        if (!user || user.deletedAt) {
            throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
            throw new Error('Account is inactive');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens
        const tokens = this.generateTokens(user.id, user.email, user.role);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        logger.info(`User logged in: ${email}`);

        return { user: userWithoutPassword, tokens };
    }

    /**
     * Generate JWT tokens
     */
    generateTokens(userId: string, email: string, role: UserRole): TokenResponse {
        const jwtSecret = process.env.JWT_SECRET;
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
        const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        if (!jwtSecret || !jwtRefreshSecret) {
            throw new Error('JWT secrets not configured');
        }

        const payload: JwtPayload = {
            id: userId,
            email,
            role,
        };

        const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as jwt.SignOptions);
        const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn } as jwt.SignOptions);

        return {
            accessToken,
            refreshToken,
            expiresIn: jwtExpiresIn,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<TokenResponse> {
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

        if (!jwtRefreshSecret) {
            throw new Error('JWT refresh secret not configured');
        }

        try {
            const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as JwtPayload;

            // Verify user still exists and is active
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isActive: true,
                    deletedAt: true,
                },
            });

            if (!user || user.deletedAt || !user.isActive) {
                throw new Error('User not found or inactive');
            }

            // Generate new tokens
            return this.generateTokens(user.id, user.email, user.role);
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    /**
     * Change password
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, email: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid current password');
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        logger.info(`Password changed for user: ${user.email}`);
    }

    /**
     * Request password reset
     * In a real app, this would send an email. For now we'll just log it.
     */
    async requestPasswordReset(email: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive || user.deletedAt) {
            // Return success even if user not found to prevent enumeration
            return 'If your account exists, you will receive a password reset link';
        }

        // Generate reset token (in production, use a separate table or Redis with short expiry)
        const resetToken = jwt.sign(
            { id: user.id, type: 'reset' },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        // MOCK EMAIL SENDING
        logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);

        return 'Password reset link has been sent to your email';
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            if (decoded.type !== 'reset') {
                throw new Error('Invalid token type');
            }

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
            });

            if (!user || !user.isActive || user.deletedAt) {
                throw new Error('User not found');
            }

            const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });

            logger.info(`Password reset completed for user: ${user.email}`);

        } catch (error) {
            throw new Error('Invalid or expired reset token');
        }
    }

    /**
     * Logout
     * In JWT stateless auth, client discards token. 
     * We can optionally blacklist token in Redis if implemented.
     */
    async logout(userId: string): Promise<void> {
        // Placeholder for token blacklisting
        logger.info(`User logged out: ${userId}`);
    }
}

export default new AuthService();
