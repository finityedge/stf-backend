import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Determine HTTP status code from error message/type
 */
function getStatusCode(err: Error): number {
    const msg = err.message?.toLowerCase() || '';

    // CORS errors
    if (msg.includes('not allowed by cors')) return 403;

    // Auth / forbidden errors
    if (msg.includes('unauthorized') || msg.includes('invalid token') || msg.includes('jwt')) return 401;
    if (msg.includes('forbidden') || msg.includes('not allowed')) return 403;

    // Not found
    if (msg.includes('not found')) return 404;

    // Validation / bad request
    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) return 400;

    return 500;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = getStatusCode(err);

    logger.error(`${statusCode >= 500 ? 'Error' : 'Client error'} occurred:`, {
        message: err.message,
        stack: statusCode >= 500 ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    // In production, hide internal server error details but show client error messages
    const isServerError = statusCode >= 500;
    const message = (isServerError && process.env.NODE_ENV === 'production')
        ? 'An error occurred while processing your request'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: {
            code: statusCode === 403 && err.message.toLowerCase().includes('cors')
                ? 'CORS_ERROR'
                : statusCode === 401 ? 'UNAUTHORIZED'
                    : statusCode === 403 ? 'FORBIDDEN'
                        : statusCode === 404 ? 'NOT_FOUND'
                            : statusCode === 400 ? 'BAD_REQUEST'
                                : 'INTERNAL_SERVER_ERROR',
            message,
        },
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && isServerError && { stack: err.stack }),
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
