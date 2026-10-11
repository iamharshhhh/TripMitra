import { z } from "zod";

export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceTypeSchema>;

export type NormalizedKnowledgeDocument = z.infer<typeof NormalizedKnowledgeDocumentSchema>;

export interface FetchKnowledgeParams {
    destinationSlug?: string;
    category?: string;
    limit?: number;
}

export interface KnowledgeSourceProvider {
    readonly name: string;
    readonly sourceType: KnowledgeSourceType;
    fetchKnowledge(params?: FetchKnowledgeParams): Promise<NormalizedKnowledgeDocument[]>;
}

export const KnowledgeSourceTypeSchema = z.enum([
    "external_api",
    "json",
    "markdown",
    "manual",
    "other"
]);
export const NormalizedKnowledgeDocumentSchema = z.object({
    documentId: z.string().min(1),
    destinationSlug: z.string().min(1).toLowerCase(),
    destination: z.string().default("Pune"),
    country: z.string().default("India"),
    state: z.string().default("Maharashtra"),
    city: z.string().default("Pune"),
    category: z.string().min(1),
    title: z.string().min(1),
    content: z.string().min(1),
    tags: z.array(z.string()).default([]),
    source: z.string().min(1),
    sourceType: KnowledgeSourceTypeSchema.default("other"),
    sourceUrl: z.string().url().optional().or(z.literal("")),
    externalId: z.string().optional(),
    lastUpdated: z.coerce.date().optional(),
    metadata: z.record(z.unknown()).default({})
});
