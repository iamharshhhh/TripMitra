import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgeChunk extends Document {
    destination: string;
    destinationSlug: string;
    sourceFile: string;
    category: string;
    chunkIndex: number;
    chunkId: string;
    content: string;
    contentHash: string;
    embedding: number[];
    embeddingModel: string;
    embeddingDimensions: number;
    documentId?: string;
    source?: string;
    sourceType?: string;
    sourceUrl?: string;
    externalId?: string;
    country?: string;
    state?: string;
    city?: string;
    lastUpdated?: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema({
    destination: {
        type: String,
        required: true,
        trim: true,
        default: "Pune"
    },
    destinationSlug: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    sourceFile: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    chunkIndex: {
        type: Number,
        required: true,
        min: 0
    },
    chunkId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    contentHash: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number],
        required: true,
        default: undefined
    },
    embeddingModel: {
        type: String,
        required: true
    },
    embeddingDimensions: {
        type: Number,
        required: true
    },
    documentId: {
        type: String,
        index: true
    },
    source: {
        type: String,
        index: true
    },
    sourceType: {
        type: String,
        enum: ["external_api", "json", "markdown", "manual", "other"]
    },
    sourceUrl: {
        type: String
    },
    externalId: {
        type: String,
        index: true
    },
    country: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    lastUpdated: {
        type: Date
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});
// Compound indexes for efficient querying
KnowledgeChunkSchema.index({ destinationSlug: 1, category: 1 });
KnowledgeChunkSchema.index({ destinationSlug: 1, sourceFile: 1, chunkIndex: 1 });
export const KnowledgeChunkModel = (mongoose.models.KnowledgeChunk as mongoose.Model<IKnowledgeChunk>) || mongoose.model<IKnowledgeChunk>("KnowledgeChunk", KnowledgeChunkSchema);
