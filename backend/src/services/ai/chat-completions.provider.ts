import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { env } from "../../config/env.js";
import { AIRequest } from "../../types/ai.types.js";

export interface OpenAICompatibleOptions {
    providerName: string;
    endpoint: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
    extraHeaders?: Record<string, string>;
    maxToolCalls?: number;
    isEnabled?: boolean;
}

export class OpenAICompatibleProvider {
    providerName;
    endpoint;
    apiKey;
    model;
    timeoutMs;
    extraHeaders;
    maxToolCalls;
    isEnabled;
    constructor(options: OpenAICompatibleOptions) {
        this.providerName = options.providerName;
        this.endpoint = options.endpoint;
        this.apiKey = options.apiKey;
        this.model = options.model;
        this.timeoutMs = options.timeoutMs;
        this.extraHeaders = options.extraHeaders ?? {};
        this.maxToolCalls = options.maxToolCalls ?? env.AI_MAX_TOOL_CALLS ?? 5;
        this.isEnabled = options.isEnabled ?? true;
    }
    isAvailable() {
        return this.isEnabled && Boolean(this.apiKey && this.apiKey.trim() !== "");
    }
    async generateResponse(request: AIRequest) {
        if (!this.isAvailable()) {
            throw new AppError(`Provider ${this.providerName} is not available or unconfigured.`, 503, "AI_PROVIDER_UNAVAILABLE");
        }
        const startTime = Date.now();
        const toolCallsExecuted = [];
        const accumulatedSources = (request as any).sources ? [...(request as any).sources] : [];
        // 1. Build initial conversation messages
        const messages = [];
        if (request.systemPrompt) {
            messages.push({
                role: "system",
                content: request.systemPrompt
            });
        }
        for (const msg of request.messages) {
            const media = (msg as any).media;
            if (media && media.mimeType && media.data) {
                const parts: any[] = [];
                if (msg.content) {
                    parts.push({ type: "text", text: msg.content });
                }
                parts.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${media.mimeType};base64,${media.data}`
                    }
                });
                messages.push({
                    role: msg.role === "assistant" ? "assistant" : "user",
                    content: parts
                });
            } else {
                messages.push({
                    role: msg.role === "assistant" ? "assistant" : "user",
                    content: msg.content
                });
            }
        }
        // 2. Prepare tools if provided
        const openAITools = (request as any).tools ? (request as any).tools.getOpenAIToolDefinitions() : undefined;
        const hasTools = Boolean(openAITools && openAITools.length > 0);
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let finalResponseText = "";
        let finishReason;
        // 3. Multi-turn tool execution loop
        for (let turn = 0; turn <= this.maxToolCalls; turn++) {
            const payload: any = {
                model: this.model,
                messages,
                temperature: request.temperature ?? 0.7
            };
            if (hasTools) {
                payload.tools = openAITools;
                payload.tool_choice = "auto";
            }
            const response = await this.sendChatCompletion(payload);
            if (response.usage) {
                totalInputTokens += response.usage.prompt_tokens ?? 0;
                totalOutputTokens += response.usage.completion_tokens ?? 0;
            }
            const choice = response.choices?.[0];
            if (!choice || !choice.message) {
                throw new AppError(`Empty completion returned from ${this.providerName}.`, 502, "AI_PROVIDER_ERROR");
            }
            finishReason = choice.finish_reason;
            const message = choice.message;
            // If no tool calls requested, we are done
            if (!message.tool_calls || message.tool_calls.length === 0) {
                finalResponseText = message.content ?? "";
                break;
            }
            // Record assistant message with tool calls in history
            messages.push({
                role: "assistant",
                content: message.content ?? null,
                tool_calls: message.tool_calls
            });
            // Execute each tool call sequentially
            for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name;
                let toolInput = {};
                try {
                    toolInput = toolCall.function.arguments
                        ? JSON.parse(toolCall.function.arguments)
                        : {};
                }
                catch {
                    toolInput = {};
                }
                const toolStartTime = Date.now();
                let toolResultData;
                let isSuccess = false;
                let toolSource = "system";
                if ((request as any).tools) {
                    const result = await (request as any).tools.execute(toolName, toolInput);
                    toolResultData = result.success ? result.data : { error: result.error };
                    isSuccess = result.success;
                    toolSource = result.source;
                }
                else {
                    toolResultData = { error: `Tool ${toolName} requested but no registry was provided.` };
                }
                const durationMs = Date.now() - toolStartTime;
                toolCallsExecuted.push({
                    toolName,
                    callId: toolCall.id,
                    input: toolInput,
                    result: toolResultData,
                    success: isSuccess,
                    source: toolSource,
                    executionTimeMs: durationMs
                });
                // Append tool execution response to conversation
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: typeof toolResultData === "string" ? toolResultData : JSON.stringify(toolResultData)
                });
            }
            // If we reached max turns, generate a final synthesis prompt
            if (turn === this.maxToolCalls) {
                logger.warn({ turns: turn, provider: this.providerName }, "Max tool execution turns reached, requesting final synthesis");
                const finalSynthesisPayload = {
                    model: this.model,
                    messages,
                    temperature: request.temperature ?? 0.7
                };
                const finalResponse = await this.sendChatCompletion(finalSynthesisPayload);
                finalResponseText = finalResponse.choices?.[0]?.message?.content ?? "";
                finishReason = finalResponse.choices?.[0]?.finish_reason;
                break;
            }
        }
        const durationMs = Date.now() - startTime;
        logger.info({
            provider: this.providerName,
            model: this.model,
            durationMs,
            toolCalls: toolCallsExecuted.length,
            usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens
            }
        }, `${this.providerName} response generated successfully`);
        const result: any = {
            text: finalResponseText,
            model: this.model,
            provider: this.providerName,
            finishReason,
            usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens
            }
        };
        if (accumulatedSources.length > 0) {
            result.sources = accumulatedSources;
        }
        if (toolCallsExecuted.length > 0) {
            result.toolCallsExecuted = toolCallsExecuted;
        }
        return result;
    }
    /**
     * Sends HTTP request to the chat completions endpoint with timeout guard and error mapping.
     */
    async sendChatCompletion(payload: Record<string, unknown>) {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, this.timeoutMs);
        try {
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
                ...this.extraHeaders
            };
            const response = await fetch(this.endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeout);
            const status = response.status;
            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            }
            catch {
                data = { error: { message: rawText } };
            }
            if (!response.ok) {
                const errorMsg = data.error?.message || `HTTP ${status}: ${response.statusText}`;
                const lowerMsg = errorMsg.toLowerCase();
                // 1. Rate Limit / Quota Exhaustion
                if (status === 429 ||
                    lowerMsg.includes("rate limit") ||
                    lowerMsg.includes("quota") ||
                    lowerMsg.includes("resource_exhausted")) {
                    throw new AppError(`${this.providerName} rate limit / quota exceeded: ${errorMsg}`, 429, "AI_RATE_LIMIT_ERROR");
                }
                // 2. Client / Validation Error (non-retryable)
                if (status === 400 || status === 422) {
                    throw new AppError(`${this.providerName} invalid request: ${errorMsg}`, status, "AI_INVALID_REQUEST_ERROR");
                }
                // 3. Timeout error
                if (status === 504 || status === 408) {
                    throw new AppError(`${this.providerName} request timed out: ${errorMsg}`, 504, "AI_TIMEOUT_ERROR");
                }
                // 4. Upstream / Server Error (transient)
                if (status === 500 || status === 502 || status === 503) {
                    throw new AppError(`${this.providerName} server error (${status}): ${errorMsg}`, status, "AI_PROVIDER_ERROR");
                }
                // Default fallback for any other error
                throw new AppError(`${this.providerName} call failed (${status}): ${errorMsg}`, status >= 400 && status < 500 ? status : 502, "AI_PROVIDER_ERROR");
            }
            return data;
        }
        catch (err) {
            clearTimeout(timeout);
            if (err instanceof AppError) {
                throw err;
            }
            if (err instanceof Error && err.name === "AbortError") {
                throw new AppError(`${this.providerName} request timed out after ${this.timeoutMs}ms.`, 504, "AI_TIMEOUT_ERROR");
            }
            const msg = err instanceof Error ? err.message : String(err);
            throw new AppError(`${this.providerName} network or communication error: ${msg}`, 502, "AI_PROVIDER_ERROR");
        }
    }
}
