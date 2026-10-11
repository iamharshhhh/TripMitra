import { logger } from "../utils/logger.js";
import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;
        logger.info({
            requestId: req.id,
            method,
            path: originalUrl,
            statusCode,
            durationMs: duration
        }, `${method} ${originalUrl} ${statusCode} in ${duration}ms`);
    });
    next();
}
