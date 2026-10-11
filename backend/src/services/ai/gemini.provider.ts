import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { AIRequest } from "../../types/ai.types.js";

export interface GeminiProviderOptions {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    maxRetries?: number;
    retryBaseDelayMs?: number;
}

export function isQuotaOrRateLimitError(err: unknown) {
    if (!err)
        return false;
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes("429") ||
        lower.includes("resource_exhausted") ||
        lower.includes("quota") ||
        lower.includes("rate limit") ||
        lower.includes("rate-limit") ||
        lower.includes("rate_limit")) {
        return true;
    }
    if (typeof err === "object" && err !== null) {
        const status = (err as any).status;
        const code = (err as any).code;
        const statusCode = (err as any).statusCode;
        if (status === 429 || code === 429 || statusCode === 429 || status === "RESOURCE_EXHAUSTED") {
            return true;
        }
    }
    return false;
}
export function isTransientServerError(err: unknown) {
    if (!err)
        return false;
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    if (lower.includes("503") ||
        lower.includes("high demand") ||
        lower.includes("unavailable") ||
        lower.includes("overloaded")) {
        return true;
    }
    if (typeof err === "object" && err !== null) {
        const status = (err as any).status;
        const code = (err as any).code;
        const statusCode = (err as any).statusCode;
        if (status === 503 || code === 503 || statusCode === 503 || status === "UNAVAILABLE") {
            return true;
        }
    }
    return false;
}
export class GeminiProvider {
    providerName = "gemini";
    apiKey;
    model;
    timeoutMs;
    maxRetries;
    retryBaseDelayMs;
    client = null;
    constructor(options?: GeminiProviderOptions) {
        this.apiKey = options?.apiKey ?? env.GEMINI_API_KEY;
        this.model = options?.model ?? env.GEMINI_MODEL;
        this.timeoutMs = options?.timeoutMs ?? env.GEMINI_TIMEOUT_MS;
        this.maxRetries = options?.maxRetries ?? 2;
        this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 2000;
        if (this.apiKey && this.apiKey.trim() !== "") {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }
    isAvailable() {
        return Boolean(this.apiKey && this.apiKey.trim() !== "");
    }
    async callGenerateWithTimeout(contents: any, config: any, maxRetries = this.maxRetries, overrideTimeoutMs?: number) {
        const effectiveTimeout = overrideTimeoutMs ?? this.timeoutMs;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const activeModel = (attempt > 0 && this.model === "gemini-3.6-flash") ? "gemini-3.8-flash" : this.model;
            const generatePromise = this.client.models.generateContent({
                model: activeModel,
                contents,
                config
            });
            let timeoutTimer;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutTimer = setTimeout(() => {
                    reject(new AppError(`Gemini API request timed out after ${effectiveTimeout}ms.`, 504, "AI_TIMEOUT_ERROR"));
                }, effectiveTimeout);
            });
            try {
                return await Promise.race([generatePromise, timeoutPromise]);
            }
            catch (err) {
                const isTimeout = err instanceof AppError && err.code === "AI_TIMEOUT_ERROR";
                const is429 = isQuotaOrRateLimitError(err);
                const is503 = isTransientServerError(err);
                if ((isTimeout || is429 || is503) && attempt < maxRetries) {
                    const baseBackoff = is429 ? this.retryBaseDelayMs : 1000;
                    const backoffMs = (attempt + 1) * baseBackoff;
                    const reason = isTimeout ? "timeout" : is429 ? "429 rate limit" : "503 high demand";
                    logger.warn({ attempt: attempt + 1, maxRetries, backoffMs, reason, provider: this.providerName, model: activeModel }, `Gemini returned ${reason}; retrying with backoff`);
                    await new Promise((resolve) => setTimeout(resolve, backoffMs));
                    continue;
                }
                if (isTimeout) {
                    throw err;
                }
                if (is429) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    throw new AppError(`Gemini quota or rate limit exceeded after ${maxRetries} retries: ${errorMsg}`, 429, "AI_RATE_LIMIT_ERROR");
                }
                throw err;
            }
            finally {
                if (timeoutTimer)
                    clearTimeout(timeoutTimer);
            }
        }
        throw new AppError("Gemini generation failed after retries", 502, "AI_PROVIDER_ERROR");
    }
    async generateResponse(request: AIRequest) {
        if (!this.apiKey || this.apiKey.trim() === "") {
            logger.warn("GEMINI_API_KEY is not configured.");
            throw new AppError("Gemini API key is not configured.", 500, "AI_CONFIG_ERROR");
        }
        if (!this.client) {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
        const startTime = Date.now();
        logger.debug({ provider: this.providerName, model: this.model, messageCount: request.messages.length }, "Generating AI response with Gemini");
        const contents = request.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => {
            const parts: any[] = [];
            const media = (m as any).media;
            if (media && media.mimeType && media.data) {
                parts.push({
                    inlineData: {
                        mimeType: media.mimeType,
                        data: media.data
                    }
                });
            }
            if (m.content) {
                parts.push({ text: m.content });
            } else if (!media) {
                parts.push({ text: "" });
            }
            return {
                role: m.role === "assistant" ? "model" : "user",
                parts
            };
        });
        if (contents.length === 0) {
            contents.push({
                role: "user",
                parts: [{ text: "Hello" }]
            });
        }
        const config: any = {};
        if (request.systemPrompt) {
            config.systemInstruction = request.systemPrompt;
        }
        if (typeof request.temperature === "number") {
            config.temperature = request.temperature;
        }
        if (typeof request.maxTokens === "number") {
            config.maxOutputTokens = request.maxTokens;
        }
        if (request.enableGoogleSearch) {
            config.tools = [{ googleSearch: {} }];
        }
        if (request.tools && typeof request.tools.getDeclarations === "function") {
            const declarations = request.tools.getDeclarations();
            if (declarations && declarations.length > 0) {
                config.tools = [{ functionDeclarations: declarations }];
            }
        }
        try {
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            const toolCallsExecuted: any[] = [];
            const sources: any[] = [];
            const maxToolCalls = 5;
            const currentContents = [...contents];
            let response: any = null;
            const hasMedia = request.messages.some((m: any) => m.media && m.media.data);
            const effectiveTimeoutMs = hasMedia ? Math.max(this.timeoutMs, 45000) : this.timeoutMs;

            for (let step = 0; step <= maxToolCalls; step++) {
                response = await this.callGenerateWithTimeout(currentContents, config, this.maxRetries, effectiveTimeoutMs);
                totalInputTokens += response.usageMetadata?.promptTokenCount ?? 0;
                totalOutputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

                const candidate = response.candidates?.[0];
                if (candidate?.groundingMetadata?.webSearchQueries) {
                    sources.push({
                        source: "google-search",
                        queries: candidate.groundingMetadata.webSearchQueries
                    });
                }

                const functionCalls = response.functionCalls ||
                    candidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall) ||
                    [];

                if (!functionCalls || functionCalls.length === 0 || !request.tools) {
                    break;
                }

                if (toolCallsExecuted.length + functionCalls.length > maxToolCalls) {
                    return {
                        text: "I was unable to complete the request because the maximum tool call limit was reached.",
                        model: this.model,
                        provider: this.providerName,
                        usage: {
                            inputTokens: totalInputTokens,
                            outputTokens: totalOutputTokens
                        },
                        toolCallsExecuted,
                        sources
                    };
                }

                currentContents.push({
                    role: "model",
                    parts: candidate?.content?.parts || functionCalls.map((fc: any) => ({ functionCall: fc }))
                });

                for (const fc of functionCalls) {
                    const tool = request.tools.get(fc.name);
                    let toolResult: any;
                    if (tool) {
                        toolResult = await tool.execute(fc.args || {});
                    }
                    else {
                        toolResult = { success: false, error: `Tool ${fc.name} not found` };
                    }

                    toolCallsExecuted.push({
                        toolName: fc.name,
                        args: fc.args,
                        id: fc.id,
                        result: toolResult,
                        source: toolResult?.source || "system"
                    });

                    if (toolResult?.source) {
                        sources.push({ source: toolResult.source, data: toolResult.data });
                    }

                    currentContents.push({
                        role: "user",
                        parts: [{
                            functionResponse: {
                                name: fc.name,
                                response: toolResult
                            }
                        } as any]
                    });
                }
            }

            const finalResponseText = response?.text ?? "";
            const durationMs = Date.now() - startTime;
            logger.info({
                provider: this.providerName,
                model: this.model,
                durationMs,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens
            }, "Gemini response generated successfully");
            return {
                text: finalResponseText,
                model: this.model,
                provider: this.providerName,
                usage: {
                    inputTokens: totalInputTokens,
                    outputTokens: totalOutputTokens
                },
                toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
                sources: sources.length > 0 ? sources : undefined
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            if (err instanceof AppError) {
                logger.error({ err: err.message, durationMs, provider: this.providerName }, "Gemini error");
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : "Unknown Gemini API error";
            logger.error({ err: errorMessage, durationMs, provider: this.providerName, model: this.model }, "Gemini generateContent call failed");
            throw new AppError(`Gemini generation failed: ${errorMessage}`, 502, "AI_PROVIDER_ERROR");
        }
    }
}
