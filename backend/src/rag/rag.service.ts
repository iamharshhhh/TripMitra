import { RagRetrievalService } from "./retrieval.service.js";
import { logger } from "../utils/logger.js";

export interface RagContextResult {
    hasContext: boolean;
    contextText: string;
    sources: Array<{
        sourceFile: string;
        category: string;
        score: number;
    }>;
}

export class RagService {
    retrievalService;
    constructor(retrievalService?: RagRetrievalService) {
        this.retrievalService = retrievalService ?? new RagRetrievalService();
    }
    /**
     * Determines if RAG should be queried for the user input.
     * Simple, robust heuristic for Pune MVP destination inquiries.
     */
    shouldUseRag(query: string) {
        if (!query || query.trim().length < 3) {
            return false;
        }
        // For M6, general inquiries or travel questions benefit from Pune knowledge grounding
        return true;
    }
    /**
     * Retrieves relevant tourism knowledge and formats it as grounded reference context.
     */
    async getGroundedContext(query: string, destinationSlug = "pune", requireDestination = false) {
        if (!this.shouldUseRag(query)) {
            return { hasContext: false, contextText: "", sources: [] };
        }
        const cleanSlug = destinationSlug ? destinationSlug.trim().toLowerCase() : "";
        if (requireDestination && !cleanSlug) {
            return { hasContext: false, contextText: "", sources: [] };
        }
        try {
            const chunks = await this.retrievalService.retrieveRelevantChunks({
                query,
                destinationSlug: cleanSlug || "pune"
            });
            if (!chunks || chunks.length === 0) {
                return { hasContext: false, contextText: "", sources: [] };
            }
            // Format chunks into a clear, structured reference block
            const contextBlocks = chunks.map((chunk, idx) => {
                return `[Source ${idx + 1}: ${chunk.category} (${chunk.sourceFile})]\n${chunk.content}`;
            });
            const contextText = contextBlocks.join("\n\n---\n\n");
            const sources = chunks.map((c) => ({
                sourceFile: c.sourceFile,
                category: c.category,
                score: c.score
            }));
            return {
                hasContext: true,
                contextText,
                sources
            };
        }
        catch (err) {
            // Never crash the chat pipeline if RAG retrieval fails
            logger.warn({ err: err instanceof Error ? err.message : String(err), query }, "RAG retrieval encountered an issue; continuing without RAG context");
            return {
                hasContext: false,
                contextText: "",
                sources: []
            };
        }
    }
}
