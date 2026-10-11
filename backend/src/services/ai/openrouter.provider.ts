import { OpenAICompatibleProvider } from "./chat-completions.provider.js";
import { env } from "../../config/env.js";

export interface OpenRouterProviderOptions {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    isEnabled?: boolean;
    endpoint?: string;
    maxToolCalls?: number;
}

export class OpenRouterProvider extends OpenAICompatibleProvider {
    constructor(options?: OpenRouterProviderOptions) {
        const apiKey = options?.apiKey ?? env.OPENROUTER_API_KEY;
        const model = options?.model ?? "openai/gpt-4o-mini";
        const timeoutMs = options?.timeoutMs ?? 15000;
        const isEnabled = options?.isEnabled ?? Boolean(apiKey && apiKey.trim() !== "");
        const endpoint = options?.endpoint ?? "https://openrouter.ai/api/v1/chat/completions";
        super({
            providerName: "openrouter",
            endpoint,
            apiKey: apiKey || "",
            model,
            timeoutMs,
            isEnabled,
            maxToolCalls: options?.maxToolCalls,
            extraHeaders: {
                "HTTP-Referer": "https://tripmitra.local",
                "X-Title": "TripMitra"
            }
        });
    }
}
