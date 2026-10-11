import { DatabaseManager } from "../config/database.js";
import mongoose from "mongoose";
import { GeminiEmbeddingProvider } from "../services/ai/gemini-embedding.provider.js";
import { KnowledgeChunkModel } from "../models/KnowledgeChunk.js";

async function main() {
    console.log("Connecting to MongoDB Atlas...");
    const connected = await DatabaseManager.connect();
    if (!connected) {
        console.error("Failed to connect to MongoDB.");
        process.exit(1);
    }
    const collection = mongoose.connection.collection("knowledgechunks");
    const docCount = await collection.countDocuments();
    console.log(`Knowledge chunks count in collection: ${docCount}`);
    console.log("\nListing existing search indexes...");
    try {
        const cursor = collection.listSearchIndexes();
        const indexes = (await cursor.toArray()) as any[];
        console.log("Existing search indexes:", JSON.stringify(indexes, null, 2));
        let targetIndex = indexes.find((idx) => idx.name === "knowledge_chunks_vector_index");
        if (!targetIndex) {
            console.log("\n'knowledge_chunks_vector_index' not found. Creating index on Atlas...");
            const createResult = await collection.createSearchIndex({
                name: "knowledge_chunks_vector_index",
                type: "vectorSearch",
                definition: {
                    fields: [
                        {
                            type: "vector",
                            path: "embedding",
                            numDimensions: 768,
                            similarity: "cosine"
                        },
                        {
                            type: "filter",
                            path: "destinationSlug"
                        },
                        {
                            type: "filter",
                            path: "category"
                        }
                    ]
                }
            });
            console.log("Index creation requested. Response:", createResult);
        }
        else {
            const status = targetIndex.status;
            console.log(`\n'knowledge_chunks_vector_index' already exists with status: ${status}`);
            console.log("Index details:", JSON.stringify(targetIndex, null, 2));
        }
        console.log("\nWaiting for index to reach 'READY' status...");
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 60; // Up to 5 minutes
        while (!isReady && attempts < maxAttempts) {
            attempts++;
            const currentIndexes = (await collection.listSearchIndexes("knowledge_chunks_vector_index").toArray()) as any[];
            targetIndex = currentIndexes.find((idx) => idx.name === "knowledge_chunks_vector_index") || currentIndexes[0];
            if (targetIndex && (targetIndex.status === "READY" || targetIndex.queryable === true)) {
                console.log(`\nIndex is READY! (Status: ${targetIndex.status}, Queryable: ${targetIndex.queryable})`);
                isReady = true;
                break;
            }
            console.log(`Attempt ${attempts}/${maxAttempts}: status = ${targetIndex?.status ?? "BUILDING"}. Waiting 5s...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        if (!isReady) {
            console.error("Timed out waiting for index to become READY.");
            await DatabaseManager.disconnect();
            process.exit(1);
        }
        // Now execute live verification with Gemini embedding and native $vectorSearch
        console.log("\n=======================================================");
        console.log("EXECUTING NATIVE $vectorSearch VERIFICATION");
        console.log("=======================================================");
        const query = "Tell me about the history of Shaniwar Wada, who built it, and what are its main features.";
        console.log(`Query: "${query}"`);
        const embeddingProvider = new GeminiEmbeddingProvider();
        console.log("Generating query embedding with gemini-embedding-2 (dimensions: 768)...");
        const queryVector = await embeddingProvider.embedText(query);
        console.log(`Generated vector with length: ${queryVector.length}`);
        const pipeline = [
            {
                $vectorSearch: {
                    index: "knowledge_chunks_vector_index",
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 100,
                    limit: 5,
                    filter: { destinationSlug: "pune" }
                }
            },
            {
                $project: {
                    chunkId: 1,
                    destination: 1,
                    destinationSlug: 1,
                    sourceFile: 1,
                    category: 1,
                    content: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];
        console.log("\nExecuting aggregation pipeline with native $vectorSearch...");
        const results = await KnowledgeChunkModel.aggregate(pipeline).exec();
        console.log(`Retrieved ${results.length} results from native Atlas $vectorSearch:`);
        results.forEach((res, i) => {
            console.log(`\n--- Result #${i + 1} ---`);
            console.log(`Source: ${res.sourceFile}`);
            console.log(`Category: ${res.category}`);
            console.log(`Score ($meta: vectorSearchScore): ${res.score}`);
            console.log(`Preview: ${res.content.slice(0, 150)}...`);
        });
        console.log("\n=======================================================");
        console.log("TESTING APPLICATION RagRetrievalService RETRIEVAL");
        console.log("=======================================================");
        const { RagRetrievalService } = await import("../rag/retrieval.service.js");
        const retrievalService = new RagRetrievalService();
        const serviceChunks = await retrievalService.retrieveRelevantChunks({ query });
        console.log(`RagRetrievalService retrieved ${serviceChunks.length} chunks.`);
        serviceChunks.forEach((c, i) => {
            console.log(`Chunk #${i + 1}: [${c.category}] ${c.sourceFile} (score: ${c.score.toFixed(4)})`);
        });
    }
    catch (err) {
        console.error("Error managing search index:", err);
    }
    finally {
        await DatabaseManager.disconnect();
        process.exit(0);
    }
}
main();
