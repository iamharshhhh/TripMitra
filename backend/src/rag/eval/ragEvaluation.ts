import { logger } from "../../utils/logger.js";
import { RagRetrievalService } from "../retrieval.service.js";

export interface RagEvalTestCase {
    id: string;
    query: string;
    expectedCategory: string;
    expectedSourceFile: string;
    description: string;
}

export interface RagEvalResult {
    testCase: RagEvalTestCase;
    passed: boolean;
    retrievedTopCategory?: string;
    retrievedTopSourceFile?: string;
    topScore?: number;
    matchedChunkCount: number;
}

export interface RagEvalReport {
    totalTests: number;
    passedTests: number;
    accuracy: number;
    results: RagEvalResult[];
}

export const PUNE_RAG_EVAL_DATASET = [
    {
        id: "eval-01",
        query: "Who built Shaniwar Wada and what was its role?",
        expectedCategory: "attractions",
        expectedSourceFile: "attractions.md",
        description: "Historical attraction query on Shaniwar Wada"
    },
    {
        id: "eval-02",
        query: "What happened during the 1670 Battle of Sinhagad?",
        expectedCategory: "attractions",
        expectedSourceFile: "attractions.md",
        description: "Hill fort and battle history query for Sinhagad"
    },
    {
        id: "eval-03",
        query: "Tell me about Aga Khan Palace and Mahatma Gandhi's imprisonment.",
        expectedCategory: "attractions",
        expectedSourceFile: "attractions.md",
        description: "National monument and freedom struggle query"
    },
    {
        id: "eval-04",
        query: "What is Puneri Misal and where can I find authentic Bakarwadi?",
        expectedCategory: "food_and_dining",
        expectedSourceFile: "food_and_dining.md",
        description: "Traditional Maharashtrian cuisine query"
    },
    {
        id: "eval-05",
        query: "How does the Pune Metro work and how do I use auto-rickshaws?",
        expectedCategory: "local_transport",
        expectedSourceFile: "local_transport.md",
        description: "Urban transportation and metro lines query"
    },
    {
        id: "eval-06",
        query: "What are the five Manache Ganpati during Pune Ganeshotsav festival?",
        expectedCategory: "culture",
        expectedSourceFile: "culture.md",
        description: "Cultural festivals and traditional music query"
    },
    {
        id: "eval-07",
        query: "Is Pune safe for solo tourists and is UPI accepted everywhere?",
        expectedCategory: "safety_and_tips",
        expectedSourceFile: "safety_and_tips.md",
        description: "Travel safety, digital payments, and etiquette query"
    },
    {
        id: "eval-08",
        query: "What is the best season to visit Pune and how should I plan a 2-day trip?",
        expectedCategory: "travel_guide",
        expectedSourceFile: "travel_guide.md",
        description: "Destination overview and seasonal travel guide query"
    }
];
export async function evaluateRagRetrieval(retrievalService: RagRetrievalService, dataset = PUNE_RAG_EVAL_DATASET) {
    const results = [];
    for (const testCase of dataset) {
        const chunks = await retrievalService.retrieveRelevantChunks({
            query: testCase.query,
            destinationSlug: "pune",
            limit: 3
        });
        const topChunk = chunks[0];
        const categoryMatches = chunks.some((c) => c.category.toLowerCase() === testCase.expectedCategory.toLowerCase());
        const fileMatches = chunks.some((c) => c.sourceFile.toLowerCase() === testCase.expectedSourceFile.toLowerCase());
        const passed = categoryMatches || fileMatches;
        results.push({
            testCase,
            passed,
            retrievedTopCategory: topChunk?.category,
            retrievedTopSourceFile: topChunk?.sourceFile,
            topScore: topChunk?.score,
            matchedChunkCount: chunks.filter((c) => c.category.toLowerCase() === testCase.expectedCategory.toLowerCase()).length
        });
    }
    const passedTests = results.filter((r) => r.passed).length;
    const accuracy = dataset.length > 0 ? (passedTests / dataset.length) * 100 : 0;
    logger.info({ totalTests: dataset.length, passedTests, accuracy }, "RAG evaluation complete");
    return {
        totalTests: dataset.length,
        passedTests,
        accuracy,
        results
    };
}
