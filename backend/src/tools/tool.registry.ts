import { WeatherTool } from "./weather.tool.js";
import { PlacesTool } from "./places.tool.js";
import { TransitTool } from "./transit.tool.js";
import { logger } from "../utils/logger.js";
import { TravelTool } from "./tool.interface.js";

export class ToolRegistry {
    tools = new Map();
    /**
     * Registers a tool in the registry.
     */
    register(tool: TravelTool) {
        if (this.tools.has(tool.name)) {
            logger.warn({ toolName: tool.name }, "Overwriting existing tool registration");
        }
        this.tools.set(tool.name, tool);
        logger.debug({ toolName: tool.name }, "Registered tool in registry");
    }
    /**
     * Retrieves a tool by its unique name.
     */
    get(name: string) {
        return this.tools.get(name);
    }
    /**
     * Returns all registered tools.
     */
    getAll() {
        return Array.from(this.tools.values());
    }
    /**
     * Converts all registered tools to Gemini FunctionDeclarations format.
     */
    getDeclarations() {
        return this.getAll().map((tool) => tool.getDeclaration());
    }
    /**
     * Converts all registered tools to OpenAI / OpenRouter / xAI tool definitions format.
     */
    getOpenAIToolDefinitions() {
        return this.getAll().map((tool) => {
            const decl = tool.getDeclaration();
            const params = (decl.parametersJsonSchema ?? decl.parameters ?? {
                type: "object",
                properties: {}
            });
            return {
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: params
                }
            };
        });
    }
    /**
     * Executes a tool safely by name with structured input.
     */
    async execute(name: string, input: unknown) {
        const startTime = Date.now();
        const tool = this.tools.get(name);
        if (!tool) {
            logger.warn({ requestedTool: name }, "Attempted to execute unknown tool");
            return {
                success: false,
                error: `Tool '${name}' is not recognized. Available tools: ${Array.from(this.tools.keys()).join(", ")}`,
                source: "system",
                executionTimeMs: Date.now() - startTime
            };
        }
        try {
            logger.info({ tool: name }, "Executing tool from registry");
            const result = await tool.execute(input);
            return result;
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error({ tool: name, err: errorMsg, durationMs }, "Unexpected tool execution error");
            return {
                success: false,
                error: `Tool execution failed: ${errorMsg}`,
                source: "system",
                executionTimeMs: durationMs
            };
        }
    }
}
/**
 * Creates and returns the default application ToolRegistry populated with standard travel tools.
 */
export function getDefaultToolRegistry() {
    const registry = new ToolRegistry();
    registry.register(new WeatherTool());
    registry.register(new PlacesTool());
    registry.register(new TransitTool());
    return registry;
}
