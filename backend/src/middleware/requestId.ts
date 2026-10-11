import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.headers["x-request-id"];
    const id = typeof incomingId === "string" && incomingId.trim() ? incomingId : crypto.randomUUID();
    req.id = id;
    res.setHeader("X-Request-Id", id);
    next();
}
