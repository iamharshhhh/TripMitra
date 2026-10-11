import { ZodType, ZodTypeDef } from "zod";
import type { FunctionDeclaration } from "@google/genai";
export interface ToolResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    source: string;
    executionTimeMs: number;
}
export interface TravelTool<TInput = unknown, TOutput = unknown> {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: ZodType<TInput, ZodTypeDef, unknown>;
    getDeclaration(): FunctionDeclaration;
    execute(input: unknown): Promise<ToolResult<TOutput>>;
}
