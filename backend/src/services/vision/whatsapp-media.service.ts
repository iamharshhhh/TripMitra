import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { MAX_MEDIA_SIZE_BYTES } from "./media-validator.service.js";

const RETRY_BACKOFF_MEDIA_DOWNLOAD_MS = 500;

export interface WhatsAppMediaFetchResult {
    success: boolean;
    buffer?: Buffer;
    declaredMime?: string;
    error?: string;
}

export interface WhatsAppMediaOptions {
    correlationId?: string;
}

export class WhatsAppMediaService {
    static baseUrl = "https://graph.facebook.com";

    /**
     * Fetches media binary ephemerally in-memory from WhatsApp Cloud API.
     * Used for landmark image recognition.
     * Includes safe 1x retry on transient network errors.
     */
    static async fetchMediaBuffer(mediaId: string, maxSizeBytes: number = MAX_MEDIA_SIZE_BYTES, options?: WhatsAppMediaOptions): Promise<WhatsAppMediaFetchResult> {
        if (!env.WHATSAPP_ACCESS_TOKEN) {
            logger.warn("WhatsApp access token is not configured; cannot fetch media");
            return { success: false, error: "WHATSAPP_TOKEN_MISSING" };
        }
        if (!mediaId || typeof mediaId !== "string" || !mediaId.trim()) {
            return { success: false, error: "INVALID_MEDIA_ID" };
        }
        const cleanMediaId = mediaId.trim();
        const effectiveMaxBytes = maxSizeBytes ?? MAX_MEDIA_SIZE_BYTES;
        const correlationId = options?.correlationId;

        const performFetch = async (): Promise<WhatsAppMediaFetchResult> => {
            const configuredTimeout = 15000;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), configuredTimeout);
            try {
                logger.debug({ mediaId: cleanMediaId, correlationId }, "Fetching WhatsApp media metadata");
                // 1. Retrieve media metadata (download URL, MIME, file_size)
                const metaUrl = `${this.baseUrl}/${env.WHATSAPP_API_VERSION}/${cleanMediaId}`;
                const metaRes = await fetch(metaUrl, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
                    },
                    signal: controller.signal
                });
                if (!metaRes.ok) {
                    logger.error({ status: metaRes.status, mediaId: cleanMediaId, correlationId }, "Failed to retrieve media metadata from WhatsApp Graph API");
                    return { success: false, error: `META_LOOKUP_FAILED_${metaRes.status}` };
                }
                const metaData: any = (await metaRes.json());
                if (!metaData.url) {
                    logger.warn({ mediaId: cleanMediaId, correlationId }, "WhatsApp media metadata missing download URL");
                    return { success: false, error: "MEDIA_URL_MISSING" };
                }
                if (metaData.file_size && metaData.file_size > effectiveMaxBytes) {
                    logger.warn({ mediaId: cleanMediaId, fileSize: metaData.file_size, maxAllowed: effectiveMaxBytes, correlationId }, "WhatsApp media declared size exceeds limit; rejecting before download");
                    return { success: false, error: "OVERSIZED" };
                }
                // 2. Fetch binary stream using authenticated GET
                logger.debug({ mediaId: cleanMediaId, correlationId }, "Streaming media binary into memory");
                const binaryRes = await fetch(metaData.url, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                        "User-Agent": "curl/7.64.1"
                    },
                    signal: controller.signal
                });
                if (!binaryRes.ok) {
                    logger.error({ status: binaryRes.status, mediaId: cleanMediaId, correlationId }, "Failed to download media binary from lookaside endpoint");
                    return { success: false, error: `MEDIA_DOWNLOAD_FAILED_${binaryRes.status}` };
                }
                const arrayBuffer = await binaryRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                if (buffer.length > effectiveMaxBytes) {
                    logger.warn({ mediaId: cleanMediaId, sizeBytes: buffer.length, maxAllowed: effectiveMaxBytes, correlationId }, "Downloaded media binary exceeded limit; rejecting");
                    return { success: false, error: "OVERSIZED" };
                }
                logger.info({ mediaId: cleanMediaId, sizeBytes: buffer.length, declaredMime: metaData.mime_type, correlationId }, "WhatsApp media binary successfully retrieved into ephemeral memory");
                return {
                    success: true,
                    buffer,
                    declaredMime: metaData.mime_type
                };
            } catch (err) {
                const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
                const errorMsg = isTimeout ? "Media download timed out" : err instanceof Error ? err.message : String(err);
                logger.error({ mediaId: cleanMediaId, err: errorMsg, correlationId }, "Error during WhatsApp media retrieval");
                return { success: false, error: isTimeout ? "MEDIA_DOWNLOAD_TIMEOUT" : "FETCH_ERROR" };
            } finally {
                clearTimeout(timer);
            }
        };

        try {
            const initialAttempt = await performFetch();
            if (initialAttempt.success) {
                return initialAttempt;
            }
            // Check if safely retryable
            const isTransient = initialAttempt.error === "MEDIA_DOWNLOAD_TIMEOUT" ||
                initialAttempt.error === "FETCH_ERROR" ||
                initialAttempt.error === "META_LOOKUP_FAILED_500" ||
                initialAttempt.error === "META_LOOKUP_FAILED_502" ||
                initialAttempt.error === "META_LOOKUP_FAILED_503" ||
                initialAttempt.error === "META_LOOKUP_FAILED_504" ||
                initialAttempt.error === "MEDIA_DOWNLOAD_FAILED_500" ||
                initialAttempt.error === "MEDIA_DOWNLOAD_FAILED_502" ||
                initialAttempt.error === "MEDIA_DOWNLOAD_FAILED_503" ||
                initialAttempt.error === "MEDIA_DOWNLOAD_FAILED_504";

            if (isTransient) {
                logger.info({ mediaId: cleanMediaId, correlationId }, "Retrying transient media download failure");
                await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MEDIA_DOWNLOAD_MS));
                return await performFetch();
            }
            return initialAttempt;
        } catch (err) {
            const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
            const errorMsg = isTimeout ? "Media download timed out" : err instanceof Error ? err.message : String(err);
            logger.error({ mediaId: cleanMediaId, err: errorMsg, correlationId }, "Error during WhatsApp media retrieval");
            return { success: false, error: isTimeout ? "MEDIA_DOWNLOAD_TIMEOUT" : "FETCH_ERROR" };
        }
    }
}
