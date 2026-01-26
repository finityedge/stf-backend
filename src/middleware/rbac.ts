import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const user = (req as any).user;

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (user.role !== UserRole.ADMIN) {
            res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware to check if user has student role
 */
export const requireStudent = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const user = (req as any).user;

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        if (user.role !== UserRole.STUDENT) {
            res.status(403).json({
                success: false,
                message: 'Student access required'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware to check if user has board role
 */
export const requireBoard = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const user = (req as any).user;

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // BOARD role check - assuming ONLY board members can access these routes
        // If Admins also need access, use: if (user.role !== UserRole.BOARD && user.role !== UserRole.ADMIN)
        if (user.role !== UserRole.BOARD && user.role !== UserRole.ADMIN) {
            res.status(403).json({
                success: false,
                message: 'Board access required'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
