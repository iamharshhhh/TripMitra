import crypto from "crypto";
import { env } from "../config/env.js";
import { ForbiddenError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { Request, Response, NextFunction } from "express";

/**
 * Validates Meta X-Hub-Signature-256 header using WHATSAPP_APP_SECRET.
 * If WHATSAPP_APP_SECRET is not configured, signature verification is skipped for development.
 */
export function verifyWhatsAppSignature(req: Request, _res: Response, next: NextFunction) {
    // If app secret is not configured in development, skip verification
    if (!env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET.trim() === "") {
        if (env.NODE_ENV === "production") {
            logger.error("WhatsApp webhook rejected: WHATSAPP_APP_SECRET is mandatory in production.");
            throw new ForbiddenError("WHATSAPP_APP_SECRET is required in production.");
        }
        return next();
    }
    const signatureHeader = req.headers["x-hub-signature-256"];
    if (typeof signatureHeader !== "string" || !signatureHeader.startsWith("sha256=")) {
        logger.warn("WhatsApp POST webhook rejected: Missing or malformed X-Hub-Signature-256 header.");
        throw new ForbiddenError("Missing or invalid X-Hub-Signature-256 header.");
    }
    const receivedSig = signatureHeader.slice(7).trim();
    const rawBody = req.rawBody || Buffer.from("");
    const expectedSig = crypto
        .createHmac("sha256", env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest("hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");
    let receivedBuffer;
    try {
        receivedBuffer = Buffer.from(receivedSig, "hex");
    }
    catch {
        logger.warn("WhatsApp POST webhook rejected: Malformed hex signature.");
        throw new ForbiddenError("Invalid WhatsApp webhook signature format.");
    }
    // Ensure buffers are the exact same byte length before timingSafeEqual to avoid unhandled exceptions
    if (receivedBuffer.length !== expectedBuffer.length) {
        logger.warn("WhatsApp POST webhook rejected: Signature length mismatch.");
        throw new ForbiddenError("Invalid WhatsApp webhook signature.");
    }
    const isMatch = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    if (!isMatch) {
        logger.warn("WhatsApp POST webhook rejected: Signature verification failed.");
        throw new ForbiddenError("WhatsApp webhook signature mismatch.");
    }
    next();
}
