import crypto from "crypto";
import { env } from "../config/env.js";

export interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}

export interface DocumentChunk {
    chunkIndex: number;
    content: string;
    contentHash: string;
}

export class DocumentChunker {
    /**
     * Helper to break a single oversized paragraph into sub-segments by sentence or word boundaries.
     */
    static splitLongBlock(block: any, maxSize: any) {
        if (block.length <= maxSize) {
            return [block];
        }
        // Split on sentence boundaries
        const sentences = block.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 0);
        const subBlocks = [];
        let currentSub = "";
        for (const sentence of sentences) {
            if (!currentSub) {
                currentSub = sentence;
            }
            else if (currentSub.length + 1 + sentence.length <= maxSize) {
                currentSub += " " + sentence;
            }
            else {
                subBlocks.push(currentSub);
                currentSub = sentence;
            }
        }
        if (currentSub.trim().length > 0) {
            subBlocks.push(currentSub.trim());
        }
        return subBlocks;
    }
    /**
     * Deterministically splits markdown content into chunks, respecting natural section/paragraph boundaries.
     */
    static chunkDocument(content: string, options?: ChunkOptions) {
        const chunkSize = options?.chunkSize ?? env.RAG_CHUNK_SIZE;
        const chunkOverlap = options?.chunkOverlap ?? env.RAG_CHUNK_OVERLAP;
        const normalizedContent = content.replace(/\r\n/g, "\n").trim();
        if (!normalizedContent) {
            return [];
        }
        // Split on markdown sections or paragraphs
        const rawParagraphs = normalizedContent
            .split(/(?=\n#{1,4}\s)|\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
        // Break any oversized paragraphs
        const paragraphs = [];
        for (const p of rawParagraphs) {
            if (p.length > chunkSize) {
                paragraphs.push(...this.splitLongBlock(p, chunkSize));
            }
            else {
                paragraphs.push(p);
            }
        }
        const rawChunks = [];
        let currentChunk = "";
        for (const paragraph of paragraphs) {
            if (!currentChunk) {
                currentChunk = paragraph;
                continue;
            }
            // Check if adding the next paragraph fits within the target chunkSize
            if (currentChunk.length + 2 + paragraph.length <= chunkSize) {
                currentChunk += "\n\n" + paragraph;
            }
            else {
                rawChunks.push(currentChunk);
                // Calculate overlap from the end of the previous chunk
                if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
                    const overlapSlice = currentChunk.slice(-chunkOverlap);
                    // Try to snap to the beginning of a word within the overlap
                    const firstSpace = overlapSlice.indexOf(" ");
                    const cleanOverlap = firstSpace > 0 ? overlapSlice.slice(firstSpace + 1) : overlapSlice;
                    currentChunk = cleanOverlap + "\n\n" + paragraph;
                }
                else {
                    currentChunk = paragraph;
                }
            }
        }
        if (currentChunk.trim().length > 0) {
            rawChunks.push(currentChunk.trim());
        }
        return rawChunks.map((chunkText, index) => {
            const trimmed = chunkText.trim();
            const hash = crypto.createHash("sha256").update(trimmed).digest("hex");
            return {
                chunkIndex: index,
                content: trimmed,
                contentHash: hash
            };
        });
    }
}
