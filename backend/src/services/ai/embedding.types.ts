export interface EmbeddingProvider {
    readonly providerName: string;
    readonly modelName: string;
    readonly dimensions: number;
    embedText(text: string): Promise<number[]>;
}
