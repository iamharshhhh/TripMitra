import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { isQuotaOrRateLimitError, isTransientServerError } from "./gemini.provider.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

export interface GeminiEmbeddingProviderOptions {
    apiKey?: string;
    model?: string;
    dimensions?: number;
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
}

export class GeminiEmbeddingProvider {
    providerName = "gemini";
    modelName;
    dimensions;
    apiKey;
    timeoutMs;
    maxRetries;
    retryBaseDelayMs;
    client = null;
    constructor(options?: GeminiEmbeddingProviderOptions) {
        this.apiKey = options?.apiKey ?? env.GEMINI_API_KEY;
        this.modelName = options?.model ?? env.GEMINI_EMBEDDING_MODEL;
        this.dimensions = options?.dimensions ?? env.GEMINI_EMBEDDING_DIMENSIONS;
        this.timeoutMs = options?.timeoutMs ?? env.GEMINI_TIMEOUT_MS;
        this.maxRetries = options?.maxRetries ?? 1;
        this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 1500;
        if (this.apiKey && this.apiKey.trim() !== "") {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }
    async embedText(text: string) {
        if (!this.apiKey || this.apiKey.trim() === "") {
            logger.warn("GEMINI_API_KEY is not configured for embeddings.");
            throw new AppError("Gemini API key is not configured for embeddings.", 500, "EMBEDDING_CONFIG_ERROR");
        }
        if (!text || text.trim() === "") {
            throw new AppError("Cannot generate embedding for empty text.", 400, "INVALID_INPUT");
        }
        if (!this.client) {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
        const startTime = Date.now();
        logger.debug({ provider: this.providerName, model: this.modelName, textLength: text.length }, "Generating text embedding");
        const maxRetries = this.maxRetries;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const embedPromise = this.client.models.embedContent({
                    model: this.modelName,
                    contents: text.trim(),
                    config: {
                        outputDimensionality: this.dimensions
                    }
                });
                let timeoutTimer;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutTimer = setTimeout(() => {
                        reject(new AppError("Gemini embedding request timed out.", 504, "EMBEDDING_TIMEOUT_ERROR"));
                    }, this.timeoutMs);
                });
                const rawResponse = await Promise.race([embedPromise, timeoutPromise]).finally(() => {
                    if (timeoutTimer)
                        clearTimeout(timeoutTimer);
                });
                const response = rawResponse;
                // Extract embedding vector from response structure
                const vector = response.embeddings?.[0]?.values ?? response.embedding?.values;
                if (!vector || !Array.isArray(vector) || vector.length === 0) {
                    throw new AppError("Gemini returned empty or invalid embedding vector.", 502, "EMBEDDING_PROVIDER_ERROR");
                }
                // Strict validation of output dimensionality
                if (vector.length !== this.dimensions) {
                    throw new AppError(`Embedding dimensionality mismatch: expected ${this.dimensions}, received ${vector.length}`, 500, "EMBEDDING_DIMENSION_MISMATCH");
                }
                const durationMs = Date.now() - startTime;
                logger.debug({
                    provider: this.providerName,
                    model: this.modelName,
                    dimensions: vector.length,
                    durationMs
                }, "Embedding generated successfully");
                return vector;
            }
            catch (err) {
                if (err instanceof AppError &&
                    (err.code === "EMBEDDING_TIMEOUT_ERROR" ||
                        err.code === "INVALID_INPUT" ||
                        err.code === "EMBEDDING_DIMENSION_MISMATCH")) {
                    throw err;
                }
                const is429 = isQuotaOrRateLimitError(err);
                const is503 = isTransientServerError(err);
                if ((is429 || is503) && attempt < maxRetries) {
                    const backoffMs = (attempt + 1) * this.retryBaseDelayMs;
                    logger.warn({
                        attempt: attempt + 1,
                        maxRetries,
                        backoffMs,
                        provider: this.providerName,
                        model: this.modelName
                    }, "Gemini embedding encountered rate-limit or transient error; retrying with backoff");
                    await new Promise((resolve) => setTimeout(resolve, backoffMs));
                    continue;
                }
                const durationMs = Date.now() - startTime;
                if (err instanceof AppError) {
                    logger.error({ err: err.message, durationMs, provider: this.providerName }, "Embedding error");
                    throw err;
                }
                const errorMessage = err instanceof Error ? err.message : "Unknown Gemini embedding error";
                logger.error({ err: errorMessage, durationMs, provider: this.providerName, model: this.modelName }, "Gemini embedContent call failed");
                throw new AppError(`Gemini embedding failed: ${errorMessage}`, 502, "EMBEDDING_PROVIDER_ERROR");
            }
        }
        throw new AppError("Gemini embedding failed after retries", 502, "EMBEDDING_PROVIDER_ERROR");
    }
}
