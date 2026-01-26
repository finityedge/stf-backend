import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred while processing your request'
        : err.message;

    res.status(500).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
    });
};
