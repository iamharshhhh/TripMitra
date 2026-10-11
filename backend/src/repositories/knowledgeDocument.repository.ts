import mongoose from "mongoose";
import { KnowledgeDocumentModel } from "../models/KnowledgeDocument.js";
import { IKnowledgeDocument } from "../models/KnowledgeDocument.js";

export class KnowledgeDocumentRepository {
    /**
     * Idempotently upserts a knowledge document identified by its documentId
     */
    static async upsertDocument(data: Partial<IKnowledgeDocument>) {
        const documentId = data.documentId;
        if (!documentId) {
            throw new Error("documentId is required for upserting a knowledge document");
        }
        if (mongoose.connection.readyState !== 1) {
            return data;
        }
        const doc = await KnowledgeDocumentModel.findOneAndUpdate({ documentId }, { $set: data }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).exec();
        return doc;
    }
    static async findByDocumentId(documentId: string) {
        return KnowledgeDocumentModel.findOne({ documentId }).exec();
    }
    static async findByDestination(destinationSlug: string) {
        return KnowledgeDocumentModel.find({ destinationSlug }).sort({ category: 1, title: 1 }).exec();
    }
    static async findBySourceAndExternalId(source: string, externalId: string) {
        return KnowledgeDocumentModel.findOne({ source, externalId }).exec();
    }
    static async countByDestination(destinationSlug: string) {
        return KnowledgeDocumentModel.countDocuments({ destinationSlug }).exec();
    }
    static async deleteByDocumentId(documentId: string) {
        const result = await KnowledgeDocumentModel.deleteOne({ documentId }).exec();
        return result.deletedCount > 0;
    }
}
