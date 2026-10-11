import { KnowledgeChunkModel } from "../models/KnowledgeChunk.js";
import { logger } from "../utils/logger.js";
import { IKnowledgeChunk } from "../models/KnowledgeChunk.js";

export interface VectorSearchParams {
    vector: number[];
    destinationSlug?: string;
    category?: string;
    limit?: number;
    numCandidates?: number;
    indexName?: string;
}

export interface VectorSearchResult {
    chunk: IKnowledgeChunk;
    score: number;
}

function calculateCosineSimilarity(a: any, b: any) {
    if (!a || !b || a.length !== b.length || a.length === 0)
        return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}
export class KnowledgeChunkRepository {
    /**
     * Idempotently upserts a knowledge chunk identified by its chunkId
     */
    static async upsertChunk(data: Partial<IKnowledgeChunk>) {
        const chunkId = data.chunkId;
        if (!chunkId) {
            throw new Error("chunkId is required for upserting a knowledge chunk");
        }
        const chunk = await KnowledgeChunkModel.findOneAndUpdate({ chunkId }, { $set: data }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).exec();
        return chunk;
    }
    static async findByChunkId(chunkId: string) {
        return KnowledgeChunkModel.findOne({ chunkId }).exec();
    }
    static async findByDestination(destinationSlug: string) {
        return KnowledgeChunkModel.find({ destinationSlug }).sort({ sourceFile: 1, chunkIndex: 1 }).exec();
    }
    static async countByDestination(destinationSlug: string) {
        return KnowledgeChunkModel.countDocuments({ destinationSlug }).exec();
    }
    /**
     * Executes Vector Search on knowledge chunks using MongoDB Atlas Vector Search ($vectorSearch).
     * Falls back to exact cosine similarity calculation if Atlas Search index is missing or building.
     */
    static async vectorSearch(params: VectorSearchParams) {
        const { vector, destinationSlug = "pune", category, limit = 5, numCandidates = 100, indexName = "knowledge_chunks_vector_index" } = params;
        const queryFilter: Record<string, any> = {};
        if (destinationSlug)
            queryFilter.destinationSlug = destinationSlug;
        if (category)
            queryFilter.category = category;
        const pipeline = [
            {
                $vectorSearch: {
                    index: indexName,
                    path: "embedding",
                    queryVector: vector,
                    numCandidates,
                    limit,
                    filter: Object.keys(queryFilter).length > 0 ? queryFilter : undefined
                }
            },
            {
                $addFields: {
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];
        try {
            const results = (await KnowledgeChunkModel.aggregate(pipeline).exec());
            if (results && results.length > 0) {
                logger.info({ resultCount: results.length, topScore: results[0]?.score }, "Native MongoDB Atlas $vectorSearch executed successfully");
                return results.map((doc) => ({
                    chunk: doc,
                    score: typeof doc.score === "number" ? doc.score : 1.0
                }));
            }
            // If Atlas $vectorSearch returned 0 results (e.g. index not yet created on Atlas), fallback to in-memory cosine
            const docCount = await KnowledgeChunkModel.countDocuments(queryFilter).exec();
            if (docCount > 0) {
                logger.debug({ docCount, destinationSlug }, "Atlas Search returned 0 results; using in-memory cosine similarity fallback");
                const candidates = await KnowledgeChunkModel.find(queryFilter).exec();
                const scoredCandidates = candidates.map((chunk) => ({
                    chunk,
                    score: calculateCosineSimilarity(vector, chunk.embedding)
                }));
                scoredCandidates.sort((a, b) => b.score - a.score);
                return scoredCandidates.slice(0, limit);
            }
            return [];
        }
        catch (atlasErr) {
            // If Atlas Vector Search threw an exception (e.g. local mongodb or index missing error)
            logger.debug({ err: atlasErr instanceof Error ? atlasErr.message : atlasErr }, "MongoDB $vectorSearch aggregation error; falling back to in-memory cosine ranking");
            const candidates = await KnowledgeChunkModel.find(queryFilter).exec();
            const scoredCandidates = candidates.map((chunk) => ({
                chunk,
                score: calculateCosineSimilarity(vector, chunk.embedding)
            }));
            // Sort descending by cosine similarity and slice top-K
            scoredCandidates.sort((a, b) => b.score - a.score);
            return scoredCandidates.slice(0, limit);
        }
    }
}
