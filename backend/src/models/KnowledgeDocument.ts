import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgeDocument extends Document {
    documentId: string;
    destination: string;
    destinationSlug: string;
    country: string;
    state: string;
    city: string;
    category: string;
    title: string;
    content: string;
    tags: string[];
    source: string;
    sourceType: "external_api" | "json" | "markdown" | "manual" | "other";
    sourceUrl?: string;
    externalId?: string;
    contentHash: string;
    lastUpdated: Date;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeDocumentSchema = new Schema({
    documentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
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
    country: {
        type: String,
        required: true,
        trim: true,
        default: "India"
    },
    state: {
        type: String,
        required: true,
        trim: true,
        default: "Maharashtra"
    },
    city: {
        type: String,
        required: true,
        trim: true,
        default: "Pune"
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    tags: {
        type: [String],
        default: []
    },
    source: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    sourceType: {
        type: String,
        required: true,
        enum: ["external_api", "json", "markdown", "manual", "other"],
        default: "other"
    },
    sourceUrl: {
        type: String,
        trim: true
    },
    externalId: {
        type: String,
        trim: true,
        index: true
    },
    contentHash: {
        type: String,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    bufferCommands: false
});
KnowledgeDocumentSchema.index({ destinationSlug: 1, category: 1 });
KnowledgeDocumentSchema.index({ source: 1, externalId: 1 });
export const KnowledgeDocumentModel = mongoose.model("KnowledgeDocument", KnowledgeDocumentSchema, "knowledgedocuments");
