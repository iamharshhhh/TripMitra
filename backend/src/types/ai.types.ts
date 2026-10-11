export type AIMessageRole = "user" | "assistant" | "system";

export interface AIMediaContent {
    mimeType: string;
    data: string;
}

export interface AIMessage {
    role: AIMessageRole;
    content: string;
    media?: AIMediaContent;
}
export interface AISourceAttribution {
    sourceFile: string;
    category: string;
    score: number;
    source?: string;
    title?: string;
}
export interface AIRequest {
    messages: AIMessage[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: any;
    enableGoogleSearch?: boolean;
}
export interface AIResponse {
    text: string;
    model: string;
    provider: string;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
    };
    finishReason?: string;
    toolCallsExecuted?: any[];
    sources?: any[];
}
export interface AIProvider {
    readonly providerName: string;
    generateResponse(request: AIRequest): Promise<AIResponse>;
    isAvailable?(): boolean;
}
