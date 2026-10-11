import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Sanitizes MongoDB connection string for safe logging
 */
export function sanitizeMongoUri(uri: string) {
    try {
        return uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    }
    catch {
        return "mongodb://***";
    }
}
export class DatabaseManager {
    static isConnected() {
        return mongoose.connection.readyState === 1;
    }
    static async connect(customUri?: string) {
        if (this.isConnected()) {
            return true;
        }
        const uri = customUri || env.MONGODB_URI;
        const dbName = env.MONGODB_DB_NAME;
        const sanitizedUri = sanitizeMongoUri(uri);
        try {
            logger.info({ uri: sanitizedUri, dbName }, "Connecting to MongoDB...");
            await mongoose.connect(uri, {
                dbName,
                serverSelectionTimeoutMS: 5000
            });
            logger.info("MongoDB connected successfully.");
            return true;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown database connection error";
            logger.error({ err: errorMsg, uri: sanitizedUri }, "Failed to connect to MongoDB.");
            return false;
        }
    }
    static async disconnect() {
        try {
            await mongoose.disconnect();
            logger.info("MongoDB disconnected successfully.");
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error during disconnect";
            logger.error({ err: errorMsg }, "Error disconnecting from MongoDB.");
        }
    }
}
export const connectDatabase = (uri?: string) => DatabaseManager.connect(uri);
export const disconnectDatabase = () => DatabaseManager.disconnect();
export const isDatabaseConnected = () => DatabaseManager.isConnected();
