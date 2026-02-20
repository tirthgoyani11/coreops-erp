/**
 * Centralized Error Handler Utility
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async Handler Wrapper
 * Eliminates try-catch in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Prisma — record not found
    if (err.code === 'P2025') {
        error = new AppError('Resource not found', 404);
    }

    // Prisma — unique constraint violation
    if (err.code === 'P2002') {
        const field = err.meta?.target?.join(', ') || 'field';
        error = new AppError(`Duplicate value entered for ${field}`, 400);
    }

    // Prisma — foreign key constraint failure
    if (err.code === 'P2003') {
        error = new AppError('Related resource not found', 400);
    }

    // Prisma — validation error
    if (err.name === 'PrismaClientValidationError') {
        error = new AppError('Invalid data provided', 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Token expired', 401);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { AppError, asyncHandler, errorHandler };
