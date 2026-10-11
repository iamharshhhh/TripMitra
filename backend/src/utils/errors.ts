
export class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class NotFoundError extends AppError {
    constructor(message = "The requested resource was not found.", details?: unknown) {
        super(message, 404, "RESOURCE_NOT_FOUND", details);
    }
}
export class BadRequestError extends AppError {
    constructor(message = "Bad request.", details?: unknown) {
        super(message, 400, "BAD_REQUEST", details);
    }
}
export class ValidationError extends AppError {
    constructor(message = "Validation failed.", details?: unknown) {
        super(message, 400, "VALIDATION_ERROR", details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized access.", details?: unknown) {
        super(message, 401, "UNAUTHORIZED", details);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden access.", details?: unknown) {
        super(message, 403, "FORBIDDEN", details);
    }
}
