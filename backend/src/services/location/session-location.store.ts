import { isValidCoordinate } from "../../utils/geography.js";
import { PROXIMITY_BOUNDARIES } from "./location.types.js";
import { logger } from "../../utils/logger.js";

/**
 * Masks numeric GPS coordinates for safe debug telemetry without leaking exact user position.
 * e.g. 18.5196, 73.8553 -> "18.51**, 73.85**"
 */
export function maskCoordinates(latitude: number, longitude: number) {
    const latStr = latitude.toFixed(4);
    const lonStr = longitude.toFixed(4);
    const maskedLat = latStr.substring(0, latStr.length - 2) + "**";
    const maskedLon = lonStr.substring(0, lonStr.length - 2) + "**";
    return `${maskedLat}, ${maskedLon}`;
}
/**
 * SessionLocationStore (M9.3)
 *
 * Strictly in-memory cache for live user location pins.
 *
 * Guarantees:
 * - Keyed by conversationId ONLY.
 * - New pin replaces any existing pin for that conversationId.
 * - Automatic 30-minute TTL expiration.
 * - Explicit clearing capability (e.g. user requests "clear location").
 * - Automatic 5-minute background sweeper for expired entries.
 * - Zero database persistence.
 * - Zero persistence across process restarts.
 */
export class SessionLocationStore {
    static store = new Map();
    static sweeperInterval = null;
    static {
        this.startSweeper();
    }
    /**
     * Starts the 5-minute expired-entry cleanup timer.
     */
    static startSweeper() {
        if (this.sweeperInterval)
            return;
        this.sweeperInterval = setInterval(() => {
            SessionLocationStore.sweepExpiredEntries();
        }, 5 * 60 * 1000);
        // Ensure timer does not prevent process termination in tests/scripts
        if (this.sweeperInterval.unref) {
            this.sweeperInterval.unref();
        }
    }
    /**
     * Stops the sweeper timer (useful for clean test teardowns).
     */
    static stopSweeper() {
        if (this.sweeperInterval) {
            clearInterval(this.sweeperInterval);
            this.sweeperInterval = null;
        }
    }
    /**
     * Sweeps and removes all expired entries.
     */
    static sweepExpiredEntries(now = Date.now()) {
        let sweptCount = 0;
        for (const [convId, entry] of this.store.entries()) {
            if (entry.expiresAt <= now) {
                this.store.delete(convId);
                sweptCount++;
            }
        }
        if (sweptCount > 0) {
            logger.debug({ sweptCount }, "SessionLocationStore swept expired location entries");
        }
        return sweptCount;
    }
    /**
     * Sets or updates the active location pin for a conversation.
     * Validates coordinate bounds and finite numbers before storing.
     */
    static setLocation(conversationId: string, latitude: number, longitude: number, name?: string, address?: string, ttlMs = PROXIMITY_BOUNDARIES.SESSION_TTL_MS, now = Date.now()) {
        if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
            logger.warn("SessionLocationStore: Rejected location update due to invalid conversationId");
            return false;
        }
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isValidCoordinate(latitude, longitude)) {
            logger.warn({ conversationId, valid: false }, "SessionLocationStore: Rejected invalid or out-of-bounds coordinates");
            return false;
        }
        const pin = {
            latitude,
            longitude,
            name: typeof name === "string" ? name.trim() : undefined,
            address: typeof address === "string" ? address.trim() : undefined,
            timestamp: now
        };
        const entry = {
            conversationId: conversationId.trim(),
            pin,
            expiresAt: now + ttlMs
        };
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            coords: maskCoordinates(latitude, longitude),
            ttlMs
        }, "SessionLocationStore: Stored live location in ephemeral memory");
        return true;
    }
    /**
     * Gets the active location pin for a conversation if not expired.
     */
    static getLocation(conversationId: string, now = Date.now()) {
        if (!conversationId)
            return null;
        const entry = this.store.get(conversationId.trim());
        if (!entry)
            return null;
        if (entry.expiresAt <= now) {
            this.store.delete(conversationId.trim());
            logger.debug({ conversationId }, "SessionLocationStore: Location pin expired on access");
            return null;
        }
        return entry.pin;
    }
    /**
     * Explicitly purges the location pin for a conversation.
     */
    static clearLocation(conversationId: string) {
        if (!conversationId)
            return false;
        const deleted = this.store.delete(conversationId.trim());
        if (deleted) {
            logger.info({ conversationId }, "SessionLocationStore: Cleared live location upon request");
        }
        return deleted;
    }
    /**
     * Clears all session entries (for test isolation and process shutdown).
     */
    static clearAll() {
        this.store.clear();
    }
    /**
     * Returns total active entries count.
     */
    static size() {
        return this.store.size;
    }
}
