import { logger } from "../../utils/logger.js";

export const VISUAL_SESSION_TTL_MS = 15 * 60 * 1000; // 15-minute sliding TTL

export type VisualAnalysisType = "landmark" | "document" | "menu" | "signboard" | "scene_context" | "unknown";

export interface VisualMenuDetails {
    vegetarianItems: string[];
    foodItems: string[];
    dairyItems?: string[];
    uncertainAllergens?: string[];
    allergenDisclaimer?: string;
}

export interface VisualDocumentDetails {
    documentType: string;
    origin?: string | null;
    destination?: string | null;
    date?: string | null;
    departureTime?: string | null;
    arrivalTime?: string | null;
    operator?: string | null;
    serviceNumber?: string | null;
    terminalPlatform?: string | null;
    bookingReference?: string | null;
}

export interface VisualContextEntry {
    conversationId: string;
    buffer?: Buffer;
    mimeType?: string;
    detectedType: VisualAnalysisType;
    candidateName?: string | null;
    candidateCategory?: string | null;
    documentDetails?: VisualDocumentDetails;
    menuDetails?: VisualMenuDetails;
    signboardText?: string | null;
    extractedSummary: string;
    visualClues: string[];
    confidence?: string;
    timestamp: number;
    expiresAt: number;
}

/**
 * SessionVisualStore
 *
 * Ephemeral in-memory store for recent WhatsApp visual analysis context and image buffer.
 *
 * Guarantees:
 * - Keyed by conversationId ONLY (strictly isolated per WhatsApp user/chat).
 * - Sliding 15-minute TTL: refreshed on subsequent contextual queries.
 * - Zero database persistence (never written to MongoDB or disk).
 * - Zero passenger/personal identifiable information (PII) logging or caching.
 * - Automatic background sweeper with unref'd timer.
 *
 * ARCHITECTURAL LIMITATION:
 * Because this store lives strictly in volatile process memory to protect privacy:
 * - Active sessions are bound to this single Node.js process instance.
 * - Active context will reset if the process restarts or across multi-worker clusters
 *   unless backed by an external TTL cache like Redis.
 */
export class SessionVisualStore {
    private static store = new Map<string, VisualContextEntry>();
    private static sweeperInterval: NodeJS.Timeout | null = null;

    static {
        this.startSweeper();
    }

    /**
     * Starts the 5-minute background sweeper for expired visual sessions.
     */
    static startSweeper(): void {
        if (this.sweeperInterval) return;
        this.sweeperInterval = setInterval(() => {
            SessionVisualStore.sweepExpiredEntries();
        }, 5 * 60 * 1000);

        if (this.sweeperInterval.unref) {
            this.sweeperInterval.unref();
        }
    }

    /**
     * Stops the sweeper timer (useful for clean test teardowns).
     */
    static stopSweeper(): void {
        if (this.sweeperInterval) {
            clearInterval(this.sweeperInterval);
            this.sweeperInterval = null;
        }
    }

    /**
     * Sweeps and removes all expired entries.
     */
    static sweepExpiredEntries(now = Date.now()): number {
        let sweptCount = 0;
        for (const [convId, entry] of this.store.entries()) {
            if (entry.expiresAt <= now) {
                this.store.delete(convId);
                sweptCount++;
            }
        }
        if (sweptCount > 0) {
            logger.debug({ sweptCount }, "SessionVisualStore swept expired visual context entries");
        }
        return sweptCount;
    }

    /**
     * Sets or updates visual context for a conversation.
     */
    static setContext(
        conversationId: string,
        data: Omit<VisualContextEntry, "conversationId" | "timestamp" | "expiresAt">,
        ttlMs = VISUAL_SESSION_TTL_MS,
        now = Date.now()
    ): boolean {
        if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
            logger.warn("SessionVisualStore: Rejected update due to invalid conversationId");
            return false;
        }

        const cleanConvId = conversationId.trim();
        const entry: VisualContextEntry = {
            conversationId: cleanConvId,
            buffer: data.buffer,
            mimeType: data.mimeType,
            detectedType: data.detectedType,
            candidateName: data.candidateName || null,
            candidateCategory: data.candidateCategory || null,
            documentDetails: data.documentDetails,
            menuDetails: data.menuDetails,
            signboardText: data.signboardText || null,
            extractedSummary: data.extractedSummary || "",
            visualClues: Array.isArray(data.visualClues) ? data.visualClues.slice(0, 5) : [],
            confidence: data.confidence,
            timestamp: now,
            expiresAt: now + ttlMs
        };

        this.store.set(cleanConvId, entry);
        logger.debug(
            { conversationId: cleanConvId, detectedType: entry.detectedType, expiresAt: entry.expiresAt },
            "SessionVisualStore: Updated visual context"
        );
        return true;
    }

    /**
     * Retrieves visual context for a conversation.
     * Refreshes the sliding TTL if active. Returns null if expired or missing.
     */
    static getContext(conversationId: string, now = Date.now(), refreshTtl = true): VisualContextEntry | null {
        if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
            return null;
        }

        const cleanConvId = conversationId.trim();
        const entry = this.store.get(cleanConvId);
        if (!entry) {
            return null;
        }

        if (entry.expiresAt <= now) {
            this.store.delete(cleanConvId);
            return null;
        }

        if (refreshTtl) {
            entry.expiresAt = now + VISUAL_SESSION_TTL_MS;
        }

        return { ...entry };
    }

    /**
     * Checks if a conversation has active, unexpired visual context.
     */
    static hasContext(conversationId: string, now = Date.now()): boolean {
        return this.getContext(conversationId, now, false) !== null;
    }

    /**
     * Clears visual context for a conversation.
     */
    static clearContext(conversationId: string): boolean {
        if (!conversationId || typeof conversationId !== "string") {
            return false;
        }
        return this.store.delete(conversationId.trim());
    }

    /**
     * Clears all entries from store (test isolation).
     */
    static clearAll(): void {
        this.store.clear();
    }
}
