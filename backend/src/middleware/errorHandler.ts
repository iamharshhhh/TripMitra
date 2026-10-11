import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error | AppError, req: Request, res: Response, _next: NextFunction) {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const errorCode = isAppError ? err.code : "INTERNAL_SERVER_ERROR";
    const message = isAppError
        ? err.message
        : statusCode === 500
            ? "An unexpected error occurred."
            : err.message;
    const details = isAppError ? err.details : undefined;
    logger.error({
        requestId: req.id,
        err: err.message,
        code: errorCode,
        statusCode,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    }, "Request error handled");
    const errorResponse: { success: boolean; error: { code: string; message: string; details?: unknown; stack?: string } } = {
        success: false,
        error: {
            code: errorCode,
            message
        }
    };
    if (details !== undefined) {
        errorResponse.error.details = details;
    }
    // Include stack trace only in development/test if not an operational error
    if (env.NODE_ENV === "development" && !isAppError && err.stack) {
        errorResponse.error.stack = err.stack;
    }
    res.status(statusCode).json(errorResponse);
}
