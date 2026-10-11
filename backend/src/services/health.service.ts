import { env } from "../config/env.js";
import { DatabaseManager } from "../config/database.js";

export interface HealthStatus {
    status: "ok";
    service: string;
    timestamp: string;
    uptimeSeconds: number;
    environment: string;
    memoryUsageMb: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    };
}

export interface ReadinessStatus {
    success: boolean;
    status: "ready" | "not_ready";
    dependencies: {
        mongodb: "connected" | "disconnected";
        geminiApiKeyConfigured: boolean;
        whatsappConfigured: boolean;
    };
}

export class HealthService {
    static startTime = Date.now();
    static getHealthStatus(): HealthStatus {
        const mem = process.memoryUsage();
        return {
            status: "ok",
            service: "ai-travel-companion",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            environment: env.NODE_ENV,
            memoryUsageMb: {
                rss: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
                heapTotal: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
                heapUsed: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100
            }
        };
    }
    static getReadinessStatus(): ReadinessStatus {
        const mongoConnected = DatabaseManager.isConnected();
        const geminiApiKeyConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0);
        const whatsappConfigured = Boolean(env.WHATSAPP_ACCESS_TOKEN &&
            env.WHATSAPP_PHONE_NUMBER_ID &&
            env.WHATSAPP_ACCESS_TOKEN.length > 0 &&
            env.WHATSAPP_PHONE_NUMBER_ID.length > 0);
        const isReady = mongoConnected;
        return {
            success: isReady,
            status: isReady ? "ready" : "not_ready",
            dependencies: {
                mongodb: mongoConnected ? "connected" : "disconnected",
                geminiApiKeyConfigured,
                whatsappConfigured
            }
        };
    }
}

