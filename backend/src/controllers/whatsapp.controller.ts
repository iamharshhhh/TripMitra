import { env } from "../config/env.js";
import { ForbiddenError, BadRequestError } from "../utils/errors.js";
import { WhatsAppMessageService } from "../services/whatsapp-message.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logger } from "../utils/logger.js";

export class WhatsAppController {
    /**
     * Meta Webhook Verification (GET /api/v1/whatsapp/webhook)
     */
    static verifyWebhook = asyncHandler((req, res) => {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (!mode || !token) {
            throw new BadRequestError("Missing webhook verification parameters: hub.mode and hub.verify_token are required.");
        }
        if (mode === "subscribe" &&
            token === env.WHATSAPP_VERIFY_TOKEN &&
            env.WHATSAPP_VERIFY_TOKEN !== "") {
            logger.info("WhatsApp webhook verified successfully with Meta challenge.");
            res.status(200).send(challenge);
            return;
        }
        logger.warn({ mode }, "WhatsApp webhook verification failed with invalid token.");
        throw new ForbiddenError("WhatsApp webhook verification failed.");
    });
    /**
     * Incoming WhatsApp Webhook Events (POST /api/v1/whatsapp/webhook)
     */
    static handleWebhook = asyncHandler(async (req, res) => {
        const payload = req.body;
        // Process webhook message event
        const result = await WhatsAppMessageService.processIncomingWebhook(payload);
        // Meta requires an immediate HTTP 200 acknowledgment
        res.status(200).json({
            success: true,
            status: "EVENT_RECEIVED",
            processed: result.processed
        });
    });
}
