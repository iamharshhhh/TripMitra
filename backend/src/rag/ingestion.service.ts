import crypto from "crypto";
import { DocumentChunker } from "./chunker.js";
import { GeminiEmbeddingProvider } from "../services/ai/gemini-embedding.provider.js";
import { KnowledgeChunkRepository } from "../repositories/knowledgeChunk.repository.js";
import { KnowledgeDocumentRepository } from "../repositories/knowledgeDocument.repository.js";
import { NormalizedKnowledgeDocumentSchema } from "./sources/knowledgeSource.interface.js";
import { logger } from "../utils/logger.js";
import { EmbeddingProvider } from "../services/ai/embedding.types.js";
import { KnowledgeSourceProvider, FetchKnowledgeParams } from "./sources/knowledgeSource.interface.js";

export interface ProviderIngestionStats {
    providerName: string;
    sourceType: string;
    destinationSlug: string;
    documentsFetched: number;
    documentsCreated: number;
    documentsUpdated: number;
    documentsUnchanged: number;
    totalChunks: number;
    chunksCreated: number;
    chunksReused: number;
    embeddingsGenerated: number;
    embeddingsReused: number;
    durationMs: number;
}

export class IngestionService {
    embeddingProvider: EmbeddingProvider;
    constructor(embeddingProvider?: EmbeddingProvider) {
        this.embeddingProvider = embeddingProvider ?? new GeminiEmbeddingProvider();
    }
    /**
     * Ingests knowledge from any KnowledgeSourceProvider (e.g. MockExternalApi, REST API, JSON, Markdown).
     * Normalizes documents, stores them in MongoDB knowledgedocuments, chunks content,
     * generates 768-dim embeddings, and upserts into knowledgechunks with provenance metadata.
     */
    async ingestFromProvider(provider: KnowledgeSourceProvider, params: FetchKnowledgeParams) {
        const startTime = Date.now();
        const destinationSlug = params?.destinationSlug ?? "pune";
        logger.info({ provider: provider.name, sourceType: provider.sourceType, destinationSlug }, "Starting provider knowledge ingestion");
        const rawDocs = await provider.fetchKnowledge(params);
        const stats = {
            providerName: provider.name,
            sourceType: provider.sourceType,
            destinationSlug,
            documentsFetched: rawDocs.length,
            documentsCreated: 0,
            documentsUpdated: 0,
            documentsUnchanged: 0,
            totalChunks: 0,
            chunksCreated: 0,
            chunksReused: 0,
            embeddingsGenerated: 0,
            embeddingsReused: 0,
            durationMs: 0
        };
        for (const rawDoc of rawDocs) {
            // 1. Validate against schema
            const doc = NormalizedKnowledgeDocumentSchema.parse(rawDoc);
            // 2. Compute content hash
            const contentHash = crypto
                .createHash("sha256")
                .update(doc.title + "\n" + doc.content)
                .digest("hex");
            // 3. Check existing KnowledgeDocument
            const existingDoc = await KnowledgeDocumentRepository.findByDocumentId(doc.documentId);
            const isNew = !existingDoc;
            const isUnchanged = existingDoc && existingDoc.contentHash === contentHash;
            if (isNew) {
                stats.documentsCreated++;
            }
            else if (isUnchanged) {
                stats.documentsUnchanged++;
            }
            else {
                stats.documentsUpdated++;
            }
            // 4. Upsert KnowledgeDocument in MongoDB
            await KnowledgeDocumentRepository.upsertDocument({
                ...doc,
                contentHash,
                lastUpdated: isUnchanged && existingDoc ? existingDoc.lastUpdated : new Date()
            });
            // 5. Chunk the document content
            const chunks = DocumentChunker.chunkDocument(doc.content);
            stats.totalChunks += chunks.length;
            for (const chunk of chunks) {
                const chunkId = `${doc.destinationSlug}:${doc.source}:${doc.externalId || doc.documentId}:${chunk.chunkIndex}`;
                // Check if chunk already exists
                const existingChunk = await KnowledgeChunkRepository.findByChunkId(chunkId);
                let embedding;
                if (existingChunk &&
                    existingChunk.contentHash === chunk.contentHash &&
                    existingChunk.embedding?.length === this.embeddingProvider.dimensions) {
                    // Chunk unchanged: reuse existing embedding
                    embedding = existingChunk.embedding;
                    stats.embeddingsReused++;
                    stats.chunksReused++;
                }
                else {
                    // New or changed chunk: generate embedding
                    embedding = await this.embeddingProvider.embedText(chunk.content);
                    stats.embeddingsGenerated++;
                    stats.chunksCreated++;
                }
                // Upsert KnowledgeChunk with full provenance
                await KnowledgeChunkRepository.upsertChunk({
                    destination: doc.destination,
                    destinationSlug: doc.destinationSlug,
                    sourceFile: doc.externalId || doc.title,
                    category: doc.category,
                    chunkIndex: chunk.chunkIndex,
                    chunkId,
                    content: chunk.content,
                    contentHash: chunk.contentHash,
                    embedding,
                    embeddingModel: this.embeddingProvider.modelName,
                    embeddingDimensions: this.embeddingProvider.dimensions,
                    documentId: doc.documentId,
                    source: doc.source,
                    sourceType: doc.sourceType,
                    sourceUrl: doc.sourceUrl,
                    externalId: doc.externalId,
                    country: doc.country,
                    state: doc.state,
                    city: doc.city,
                    lastUpdated: doc.lastUpdated,
                    metadata: doc.metadata
                });
            }
        }
        stats.durationMs = Date.now() - startTime;
        logger.info(stats, "Completed provider knowledge ingestion successfully");
        return stats;
    }
}
