import { Router } from "express";
import { WhatsAppController } from "../controllers/whatsapp.controller.js";
import { verifyWhatsAppSignature } from "../middleware/verifyWhatsAppSignature.js";

export const whatsappRouter = Router();
// Meta Webhook Verification (GET) - uses hub.verify_token query parameter
whatsappRouter.get("/webhook", WhatsAppController.verifyWebhook);
// Incoming Meta Webhook Events (POST) - verified via X-Hub-Signature-256 HMAC header
whatsappRouter.post("/webhook", verifyWhatsAppSignature, WhatsAppController.handleWebhook);
