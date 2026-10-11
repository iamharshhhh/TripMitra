import { OpenAICompatibleProvider } from "./chat-completions.provider.js";
import { env } from "../../config/env.js";

export interface GrokProviderOptions {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    isEnabled?: boolean;
    endpoint?: string;
    maxToolCalls?: number;
}

export class GrokProvider extends OpenAICompatibleProvider {
    constructor(options?: GrokProviderOptions) {
        const apiKey = options?.apiKey ?? env.GROK_API_KEY;
        const model = options?.model ?? "grok-2-latest";
        const timeoutMs = options?.timeoutMs ?? 15000;
        const isEnabled = options?.isEnabled ?? Boolean(apiKey && apiKey.trim() !== "");
        const endpoint = options?.endpoint ?? "https://api.x.ai/v1/chat/completions";
        super({
            providerName: "grok",
            endpoint,
            apiKey: apiKey || "",
            model,
            timeoutMs,
            isEnabled,
            maxToolCalls: options?.maxToolCalls
        });
    }
}
