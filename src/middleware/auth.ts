import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';
import { UserRole } from '@prisma/client';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret) as JwtPayload;

        (req as any).user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role as UserRole,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expired',
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed',
        });
    }
};
