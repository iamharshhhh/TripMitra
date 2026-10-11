import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { WhatsAppTextFormatter } from "../utils/whatsapp-text-formatter.js";

export interface WhatsAppSendResponse {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

export class WhatsAppService {
    static baseUrl = "https://graph.facebook.com";

    static async sendTextMessage(to: string, messageText: string) {
        const formattedBody = WhatsAppTextFormatter.format(messageText);
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
            logger.warn("WhatsApp credentials not configured; skipping outbound API call.");
            return {
                messaging_product: "whatsapp",
                contacts: [{ input: to, wa_id: to }],
                messages: [{ id: `mock_msg_${Date.now()}` }]
            };
        }
        const formattedRecipient = to.replace(/^\+/, "").trim();
        const endpoint = `${this.baseUrl}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedRecipient,
            type: "text",
            text: {
                preview_url: false,
                body: formattedBody
            }
        };
        try {
            logger.debug({ recipient: formattedRecipient, messageLength: messageText.length }, "Sending WhatsApp text message");
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as any;
                const errorMessage = errorData?.error?.message || `WhatsApp API error (status ${response.status})`;
                logger.error({
                    status: response.status,
                    code: errorData?.error?.code,
                    subcode: errorData?.error?.error_subcode,
                    recipient: formattedRecipient
                }, "WhatsApp Cloud API error response");
                throw new AppError(`WhatsApp Cloud API failed: ${errorMessage}`, response.status >= 500 ? 502 : 400, "WHATSAPP_API_ERROR");
            }
            const responseData = (await response.json()) as WhatsAppSendResponse;
            logger.info({
                recipient: formattedRecipient,
                messageId: responseData?.messages?.[0]?.id
            }, "WhatsApp message delivered successfully");
            return responseData;
        }
        catch (err) {
            if (err instanceof AppError) {
                throw err;
            }
            const isTimeout = err instanceof Error && err.name === "TimeoutError";
            const errorMsg = isTimeout
                ? "WhatsApp API request timed out"
                : err instanceof Error
                    ? err.message
                    : "Unknown network error";
            logger.error({ err: errorMsg, recipient: formattedRecipient }, "Failed to deliver WhatsApp message");
            throw new AppError(`WhatsApp API delivery failure: ${errorMsg}`, 502, "WHATSAPP_DELIVERY_FAILED");
        }
    }

    static async sendInteractiveMessage(to: string, interactivePayload: any) {
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
            logger.warn("WhatsApp credentials not configured; skipping outbound interactive API call.");
            return {
                messaging_product: "whatsapp",
                contacts: [{ input: to, wa_id: to }],
                messages: [{ id: `mock_interactive_msg_${Date.now()}` }]
            };
        }
        const formattedRecipient = to.replace(/^\+/, "").trim();
        const endpoint = `${this.baseUrl}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const interactiveObj = interactivePayload?.interactive || interactivePayload;
        if (interactiveObj?.body?.text) {
            interactiveObj.body.text = WhatsAppTextFormatter.format(interactiveObj.body.text);
        }
        if (interactiveObj?.header?.text) {
            interactiveObj.header.text = WhatsAppTextFormatter.format(interactiveObj.header.text);
        }
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedRecipient,
            type: "interactive",
            interactive: interactiveObj
        };
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as any;
                throw new AppError(`WhatsApp Cloud API failed: ${errorData?.error?.message || response.status}`, 502, "WHATSAPP_API_ERROR");
            }
            return (await response.json()) as WhatsAppSendResponse;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError(`WhatsApp API delivery failure: ${err instanceof Error ? err.message : String(err)}`, 502, "WHATSAPP_DELIVERY_FAILED");
        }
    }
}

