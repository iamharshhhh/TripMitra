import { NotFoundError } from "../utils/errors.js";
import { Request, Response, NextFunction } from "express";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found.`));
}
