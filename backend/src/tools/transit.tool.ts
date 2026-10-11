import { z } from "zod";
import { TransitRoutingService } from "../services/transit/transit-routing.service.js";
import { logger } from "../utils/logger.js";
import { TransitRoutePlan } from "../services/transit/transit-routing.service.js";

export type TransitInput = z.infer<typeof TransitInputSchema>;

export interface TransitToolOutput {
    plan: TransitRoutePlan;
    source: "transit-routing-engine";
}

export const TransitInputSchema = z.object({
    origin: z.string().min(1, "Origin is required (e.g. 'Pune', 'Mumbai', 'Delhi')"),
    destination: z.string().min(1, "Destination is required (e.g. 'Pondicherry', 'Goa', 'Jaipur')"),
    preferredMode: z
        .enum(["train", "bus", "flight", "road", "all"])
        .optional()
        .default("all")
});
export class TransitTool {
    name = "get_transit_routes";
    description = "Provides verified multi-modal intercity transit route guidance (Train 🚆, Bus 🚌, Flight ✈️, Road/Car 🚗) between an origin and destination. Returns realistic journey durations, departure/arrival transit hubs, transfer points, corridor guidance, and official search/booking verification links. Use whenever the traveler asks how to reach a destination or inquires about trains, buses, flights, or road options.";
    inputSchema = TransitInputSchema;
    getDeclaration() {
        return {
            name: this.name,
            description: this.description,
            parametersJsonSchema: {
                type: "object",
                properties: {
                    origin: {
                        type: "string",
                        description: "Starting city, town, or transit hub (e.g. 'Pune', 'Mumbai', 'Bengaluru')."
                    },
                    destination: {
                        type: "string",
                        description: "Destination city, town, or place (e.g. 'Pondicherry', 'Goa', 'Jaipur')."
                    },
                    preferredMode: {
                        type: "string",
                        enum: ["train", "bus", "flight", "road", "all"],
                        description: "Specific transit mode requested by the user, or 'all' for complete multi-modal comparison."
                    }
                },
                required: ["origin", "destination"]
            }
        };
    }
    async execute(rawInput: unknown) {
        const startTime = Date.now();
        // 1. Validate input schema
        const parseResult = this.inputSchema.safeParse(rawInput ?? {});
        if (!parseResult.success) {
            const errorMsg = parseResult.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join("; ");
            logger.warn({ tool: this.name, error: errorMsg }, "Invalid transit tool input");
            return {
                success: false,
                error: `Invalid input parameters: ${errorMsg}`,
                source: "transit-routing-engine",
                executionTimeMs: Date.now() - startTime
            };
        }
        const { origin, destination, preferredMode } = parseResult.data;
        try {
            logger.debug({ tool: this.name, origin, destination, preferredMode }, "Computing transit route plan");
            const plan = TransitRoutingService.getRoutePlan({
                origin,
                destination,
                preferredMode: preferredMode
            });
            return {
                success: true,
                data: {
                    plan,
                    source: "transit-routing-engine"
                },
                source: "transit-routing-engine",
                executionTimeMs: Date.now() - startTime
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);
            logger.error({ tool: this.name, err: message, durationMs }, "Transit tool execution failed");
            return {
                success: false,
                error: "Unable to calculate transit routes at this time.",
                source: "transit-routing-engine",
                executionTimeMs: durationMs
            };
        }
    }
}
