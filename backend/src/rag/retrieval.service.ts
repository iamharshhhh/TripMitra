import { GeminiEmbeddingProvider } from "../services/ai/gemini-embedding.provider.js";
import { KnowledgeChunkRepository } from "../repositories/knowledgeChunk.repository.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { EmbeddingProvider } from "../services/ai/embedding.types.js";

export interface RetrievedChunk {
    content: string;
    score: number;
    sourceFile: string;
    category: string;
    destinationSlug: string;
    documentId?: string;
    source?: string;
    sourceUrl?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
}

export interface RetrievalParams {
    query: string;
    destinationSlug?: string;
    category?: string;
    limit?: number;
    numCandidates?: number;
}

export class RagRetrievalService {
    embeddingProvider;
    constructor(embeddingProvider?: EmbeddingProvider) {
        this.embeddingProvider = embeddingProvider ?? new GeminiEmbeddingProvider();
    }
    /**
     * Embeds the query and performs vector search against the KnowledgeChunk collection.
     */
    async retrieveRelevantChunks(params: RetrievalParams) {
        const { query, destinationSlug = "pune", category, limit = env.RAG_TOP_K, numCandidates = env.RAG_NUM_CANDIDATES } = params;
        if (!query || query.trim() === "") {
            return [];
        }
        const trimmedQuery = query.trim();
        logger.debug({ query: trimmedQuery, destinationSlug }, "Embedding query for RAG retrieval");
        // 1. Generate query vector using identical model and dimensionality
        const queryVector = await this.embeddingProvider.embedText(trimmedQuery);
        // 2. Perform vector search on MongoDB
        const searchResults = await KnowledgeChunkRepository.vectorSearch({
            vector: queryVector,
            destinationSlug,
            category,
            limit,
            numCandidates
        });
        // 3. Normalize results
        const normalized = searchResults.map(({ chunk, score }) => ({
            content: chunk.content,
            score,
            sourceFile: chunk.sourceFile,
            category: chunk.category,
            destinationSlug: chunk.destinationSlug,
            documentId: chunk.documentId,
            source: chunk.source,
            sourceUrl: chunk.sourceUrl,
            externalId: chunk.externalId,
            metadata: chunk.metadata
        }));
        logger.info({
            query: trimmedQuery,
            resultCount: normalized.length,
            topScore: normalized[0]?.score
        }, "Retrieved relevant RAG chunks");
        return normalized;
    }
}
