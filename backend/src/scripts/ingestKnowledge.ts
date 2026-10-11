import { DatabaseManager } from "../config/database.js";
import { IngestionService } from "../rag/ingestion.service.js";
import { MockExternalApiKnowledgeProvider } from "../rag/sources/mockExternalApi.provider.js";
import { env } from "../config/env.js";

async function runIngestion() {
    const args = process.argv.slice(2);
    let source = "mock";
    let destinationSlug = "pune";
    for (const arg of args) {
        if (arg.startsWith("--source=")) {
            source = arg.split("=")[1].toLowerCase();
        }
        if (arg.startsWith("--destination=")) {
            destinationSlug = arg.split("=")[1].toLowerCase();
        }
    }
    console.log("==================================================");
    console.log("🚀 KNOWLEDGE INGESTION PIPELINE (External / DB-Driven)");
    console.log("==================================================");
    console.log(`Source Mode:          ${source}`);
    console.log(`Destination:          ${destinationSlug}`);
    console.log(`Embedding Model:      ${env.GEMINI_EMBEDDING_MODEL}`);
    console.log(`Embedding Dimensions: ${env.GEMINI_EMBEDDING_DIMENSIONS}`);
    console.log(`Chunk Size:           ${env.RAG_CHUNK_SIZE} chars`);
    console.log(`Chunk Overlap:        ${env.RAG_CHUNK_OVERLAP} chars`);
    console.log("--------------------------------------------------");
    const connected = await DatabaseManager.connect();
    if (!connected) {
        console.error("❌ Failed to connect to MongoDB. Ingestion aborted.");
        process.exit(1);
    }
    try {
        const ingestionService = new IngestionService();
        console.log("Fetching and ingesting knowledge via KnowledgeSourceProvider...");
        // Currently uses MockExternalApiKnowledgeProvider; readily swappable for real external API
        const provider = new MockExternalApiKnowledgeProvider();
        const stats = await ingestionService.ingestFromProvider(provider, { destinationSlug });
        console.log("--------------------------------------------------");
        console.log("✅ Knowledge Ingestion Completed Successfully!");
        console.log(`📌 Source:               ${stats.providerName} (${stats.sourceType})`);
        console.log(`📄 Documents Fetched:    ${stats.documentsFetched}`);
        console.log(`✨ Documents Created:    ${stats.documentsCreated}`);
        console.log(`🔄 Documents Updated:    ${stats.documentsUpdated}`);
        console.log(`⚡ Documents Unchanged:  ${stats.documentsUnchanged}`);
        console.log(`🧩 Total Chunks:         ${stats.totalChunks}`);
        console.log(`🆕 Chunks Created:       ${stats.chunksCreated}`);
        console.log(`♻️  Chunks Reused:        ${stats.chunksReused}`);
        console.log(`🧠 Embeddings Generated: ${stats.embeddingsGenerated}`);
        console.log(`⚡ Embeddings Reused:    ${stats.embeddingsReused}`);
        console.log(`⏱️  Duration:             ${(stats.durationMs / 1000).toFixed(2)}s`);
        console.log("==================================================");
        await DatabaseManager.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Ingestion error:", err instanceof Error ? err.message : err);
        await DatabaseManager.disconnect();
        process.exit(1);
    }
}
runIngestion();
