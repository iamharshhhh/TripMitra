import { GeminiProvider } from "./gemini.provider.js";
import { OpenRouterProvider } from "./openrouter.provider.js";
import { GrokProvider } from "./grok.provider.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { AIProvider, AIRequest, AIResponse } from "../../types/ai.types.js";

export function isFallbackEligibleError(err: unknown) {
    if (!err)
        return false;
    if (err instanceof AppError) {
        // 400 Client / validation errors are not retryable on other providers
        if (err.statusCode === 400 || err.code === "AI_INVALID_REQUEST_ERROR" || err.code === "VALIDATION_ERROR") {
            return false;
        }
        // 429 (rate limit), 504 (timeout), 502/503 (upstream/server error), or AI provider errors
        if (err.statusCode === 429 ||
            err.statusCode === 504 ||
            err.statusCode === 502 ||
            err.statusCode === 503 ||
            err.code === "AI_RATE_LIMIT_ERROR" ||
            err.code === "AI_TIMEOUT_ERROR" ||
            err.code === "AI_PROVIDER_ERROR" ||
            err.code === "AI_PROVIDER_UNAVAILABLE") {
            return true;
        }
    }
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    // Explicit non-retryable indications
    if (lower.includes("invalid request") || lower.includes("validation") || lower.includes("bad request")) {
        return false;
    }
    // Quota, rate limits, timeouts, upstream transient failures
    if (lower.includes("429") ||
        lower.includes("resource_exhausted") ||
        lower.includes("quota") ||
        lower.includes("rate limit") ||
        lower.includes("rate-limit") ||
        lower.includes("rate_limit") ||
        lower.includes("timeout") ||
        lower.includes("timed out") ||
        lower.includes("504") ||
        lower.includes("503") ||
        lower.includes("502") ||
        lower.includes("unavailable") ||
        lower.includes("overloaded") ||
        lower.includes("fetch failed") ||
        lower.includes("econnreset") ||
        lower.includes("etimedout") ||
        lower.includes("enotfound")) {
        return true;
    }
    // Check object status codes if present
    if (typeof err === "object" && err !== null) {
        const status = (err as any).status;
        const statusCode = (err as any).statusCode;
        const code = (err as any).code;
        if (status === 400 || statusCode === 400 || code === 400) {
            return false;
        }
        if (status === 429 ||
            statusCode === 429 ||
            code === 429 ||
            status === 502 ||
            statusCode === 502 ||
            status === 503 ||
            statusCode === 503 ||
            status === 504 ||
            statusCode === 504 ||
            status === "RESOURCE_EXHAUSTED" ||
            status === "UNAVAILABLE") {
            return true;
        }
    }
    return false;
}
export class AiProviderManager {
    providerName = "ai-provider-manager";
    providers;
    constructor(providers?: AIProvider[]) {
        this.providers = providers ?? [
            new GeminiProvider(),
            new OpenRouterProvider(),
            new GrokProvider()
        ];
    }
    /**
     * Returns list of configured providers.
     */
    getProviders() {
        return this.providers;
    }
    /**
     * Evaluates available providers in priority order. If a provider fails with a fallback-eligible
     * error (rate limit, timeout, transient error), it logs and fails over to the next candidate.
     */
    async generateResponse(request: AIRequest) {
        const attemptedProviders = [];
        let lastError = null;
        for (const provider of this.providers) {
            const name = provider.providerName;
            // Check if provider is configured and available
            if (typeof provider.isAvailable === "function" && !provider.isAvailable()) {
                logger.debug({ provider: name }, `AI provider skipped (not available/disabled): ${name}`);
                continue;
            }
            attemptedProviders.push(name);
            logger.info({ provider: name }, `AI provider attempt: ${name}`);
            try {
                const response = await provider.generateResponse(request);
                logger.info({ provider: name, model: response.model }, `AI provider success: ${name}`);
                return response;
            }
            catch (err) {
                lastError = err;
                const errorMsg = err instanceof Error ? err.message : String(err);
                const eligible = isFallbackEligibleError(err);
                if (eligible) {
                    logger.warn({
                        provider: name,
                        err: errorMsg,
                        attempted: attemptedProviders
                    }, `AI provider failed with fallback-eligible error: ${name} -> attempting fallback`);
                    // Continue to the next provider
                    continue;
                }
                else {
                    // Non-retryable error (e.g. 400 validation error)
                    logger.error({
                        provider: name,
                        err: errorMsg
                    }, `AI provider failed with non-fallback error: ${name}`);
                    throw err;
                }
            }
        }
        // All available providers exhausted
        const summaryMsg = `All AI providers failed: [${attemptedProviders.join(", ")}]. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`;
        logger.error({ attemptedProviders }, summaryMsg);
        const statusCode = lastError instanceof AppError ? lastError.statusCode : 502;
        const errorCode = lastError instanceof AppError ? lastError.code : "AI_PROVIDER_ERROR";
        throw new AppError(summaryMsg, statusCode, errorCode, lastError);
    }
}
