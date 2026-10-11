import { logger } from "../../utils/logger.js";
import { ComparisonSubIntent, ConstraintType, ConstraintUpdateOperation } from "./travel-information.types.js";
import { StructuredPlaceContextItem } from "./places-presentation.service.js";
import { EphemeralItineraryProposal, EphemeralTripExecutionContext, UserConstraintRequirement } from "./travel-information.types.js";

export interface EphemeralComparisonSubject {
    ordinal: number;
    name: string;
    placeId?: string;
    domain?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    category?: string;
    officialUrl?: string;
    mapsUrl?: string;
}

export interface EphemeralComparisonContext {
    active: boolean;
    comparisonSubIntent: ComparisonSubIntent;
    subjects: EphemeralComparisonSubject[];
    activeDimensions: string[];
    referencePoint?: {
        name: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    explicitConstraints?: {
        maxBudget?: number;
        maxWalkingMeters?: number;
        preferredMode?: string;
        travelDate?: string;
        partySize?: number;
    };
    updatedAt: number;
}

export interface ActiveConversationPlaceContext {
    conversationId: string;
    origin?: string;
    destination?: string;
    destinationSlug?: string;
    lastSearchCategory?: "attraction" | "hotel" | "restaurant" | "cafe" | "street_food" | "transit" | "general";
    structuredPlaces: StructuredPlaceContextItem[];
    activeSelectedPlace?: StructuredPlaceContextItem;
    entityStack?: StructuredPlaceContextItem[];
    comparisonContext?: EphemeralComparisonContext;
    ephemeralConstraints?: UserConstraintRequirement[];
    ephemeralAdaptationProposal?: EphemeralItineraryProposal;
    ephemeralExecutionContext?: EphemeralTripExecutionContext;
    createdAt: number;
    expiresAt: number;
}

export interface SetPlaceContextParams {
    conversationId: string;
    origin?: string;
    destination?: string;
    destinationSlug?: string;
    lastSearchCategory?: "attraction" | "hotel" | "restaurant" | "cafe" | "street_food" | "transit" | "general";
    structuredPlaces: StructuredPlaceContextItem[];
    activeSelectedPlace?: StructuredPlaceContextItem;
    entityStack?: StructuredPlaceContextItem[];
    comparisonContext?: EphemeralComparisonContext;
    ephemeralConstraints?: UserConstraintRequirement[];
    ephemeralAdaptationProposal?: EphemeralItineraryProposal;
    ephemeralExecutionContext?: EphemeralTripExecutionContext;
    ttlMs?: number;
    now?: number;
}

/**
 * SessionPlaceStore (Phase 5)
 *
 * Strictly in-memory ephemeral reference cache for multi-turn conversational place & corridor resolution.
 *
 * Invariants & Guarantees:
 * 1. Reference resolution cache only: Zero MongoDB writes, zero permanent DB persistence.
 * 2. Keyed strictly by conversationId.
 * 3. Context Replacement: A new setPlaceContext call completely overwrites previous places/corridors.
 * 4. Write TTL Refresh: Writing new context sets a 30-minute expiration (Date.now() + 1800000).
 * 5. Read Non-Sliding TTL: Ordinary reference lookups verify validity but NEVER slide/extend the TTL.
 * 6. Expiration on Access: Expired entries are purged on lookup.
 * 7. Background Sweeper: Cleans expired entries every 5 minutes.
 */
export class SessionPlaceStore {
    static store = new Map();
    static sweeperInterval = null;
    static DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
    static {
        this.startSweeper();
    }
    static startSweeper() {
        if (this.sweeperInterval)
            return;
        this.sweeperInterval = setInterval(() => {
            SessionPlaceStore.sweepExpiredEntries();
        }, 5 * 60 * 1000);
        if (this.sweeperInterval.unref) {
            this.sweeperInterval.unref();
        }
    }
    static stopSweeper() {
        if (this.sweeperInterval) {
            clearInterval(this.sweeperInterval);
            this.sweeperInterval = null;
        }
    }
    static sweepExpiredEntries(now = Date.now()) {
        let sweptCount = 0;
        for (const [convId, entry] of this.store.entries()) {
            if (entry.expiresAt <= now) {
                this.store.delete(convId);
                sweptCount++;
            }
        }
        if (sweptCount > 0) {
            logger.debug({ sweptCount }, "SessionPlaceStore swept expired place context entries");
        }
        return sweptCount;
    }
    /**
     * Sets or replaces the active place & corridor context for a conversation.
     * Authoritative replacement: Completely replaces the previous #1..5 places and sets fresh 30-min TTL.
     */
    static setPlaceContext(params: SetPlaceContextParams) {
        const { conversationId, origin, destination, destinationSlug, lastSearchCategory, structuredPlaces, activeSelectedPlace, ttlMs = this.DEFAULT_TTL_MS, now = Date.now() } = params;
        if (!conversationId || typeof conversationId !== "string" || !conversationId.trim()) {
            logger.warn("SessionPlaceStore: Rejected place context update due to invalid conversationId");
            return false;
        }
        const rawStack = params.entityStack || (activeSelectedPlace ? [activeSelectedPlace, ...(structuredPlaces || [])] : (structuredPlaces || []));
        // Deduplicate by placeId / name and limit to max 5
        const entityStack = [];
        for (const item of rawStack) {
            if (!item)
                continue;
            const exists = entityStack.some((e) => (e.placeId && item.placeId && e.placeId === item.placeId) || e.name.toLowerCase() === item.name.toLowerCase());
            if (!exists) {
                entityStack.push(item);
            }
            if (entityStack.length >= 5)
                break;
        }
        const entry = {
            conversationId: conversationId.trim(),
            origin: origin?.trim(),
            destination: destination?.trim(),
            destinationSlug: destinationSlug?.trim(),
            lastSearchCategory,
            structuredPlaces: structuredPlaces ? structuredPlaces.slice(0, 5) : [],
            activeSelectedPlace,
            entityStack,
            comparisonContext: params.comparisonContext,
            ephemeralConstraints: params.ephemeralConstraints || [],
            ephemeralAdaptationProposal: params.ephemeralAdaptationProposal,
            ephemeralExecutionContext: params.ephemeralExecutionContext,
            createdAt: now,
            expiresAt: now + ttlMs
        };
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            placesCount: entry.structuredPlaces.length,
            entityStackCount: entry.entityStack?.length || 0,
            destination: entry.destination,
            origin: entry.origin,
            expiresAt: entry.expiresAt
        }, "SessionPlaceStore: Stored authoritative place context in ephemeral memory");
        return true;
    }
    /**
     * Non-sliding read lookup.
     * Verifies TTL without extending expiresAt. If expired, purges entry and returns null.
     */
    static getPlaceContext(conversationId: string, now = Date.now()) {
        if (!conversationId || typeof conversationId !== "string") {
            return null;
        }
        const entry = this.store.get(conversationId.trim());
        if (!entry) {
            return null;
        }
        // Check TTL expiration
        if (entry.expiresAt <= now) {
            this.store.delete(conversationId.trim());
            logger.debug({ conversationId }, "SessionPlaceStore: Place context expired on access");
            return null;
        }
        // Return reference without updating expiresAt (non-sliding read)
        return entry;
    }
    /**
     * Updates the selected active place for follow-up details without altering TTL or replacing the whole list.
     */
    static updateSelectedPlace(conversationId: string, place: StructuredPlaceContextItem, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry) {
            return false;
        }
        entry.activeSelectedPlace = place;
        // Push place to top of entityStack, keeping max 5 unique items
        const currentStack = entry.entityStack || [];
        const filtered = currentStack.filter((e) => !(e.placeId && place.placeId && e.placeId === place.placeId) && e.name.toLowerCase() !== place.name.toLowerCase());
        entry.entityStack = [place, ...filtered].slice(0, 5);
        this.store.set(conversationId.trim(), entry);
        return true;
    }
    /**
     * Updates the ephemeral comparison context without extending TTL.
     */
    static updateComparisonContext(conversationId: string, comparisonContext: Partial<EphemeralComparisonContext>, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        const merged = {
            active: comparisonContext.active !== undefined ? comparisonContext.active : true,
            comparisonSubIntent: comparisonContext.comparisonSubIntent || entry?.comparisonContext?.comparisonSubIntent || ComparisonSubIntent.DIRECT_COMPARISON,
            subjects: comparisonContext.subjects || entry?.comparisonContext?.subjects || [],
            activeDimensions: comparisonContext.activeDimensions || entry?.comparisonContext?.activeDimensions || [],
            referencePoint: comparisonContext.referencePoint || entry?.comparisonContext?.referencePoint,
            explicitConstraints: { ...entry?.comparisonContext?.explicitConstraints, ...comparisonContext.explicitConstraints },
            updatedAt: now
        };
        if (!entry) {
            // Create minimal place context to hold comparison context if none exists
            return this.setPlaceContext({
                conversationId,
                structuredPlaces: [],
                comparisonContext: merged,
                now
            });
        }
        entry.comparisonContext = merged;
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            subIntent: merged.comparisonSubIntent,
            subjectsCount: merged.subjects.length
        }, "SessionPlaceStore: Updated comparison context in ephemeral memory");
        return true;
    }
    /**
     * Retrieves the active ephemeral comparison context if present and valid.
     */
    static getComparisonContext(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.comparisonContext) {
            return null;
        }
        return {
            ...entry.comparisonContext,
            expiresAt: entry.expiresAt
        };
    }
    /**
     * Clears the comparison context for a conversation without deleting place context.
     */
    static clearComparisonContext(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.comparisonContext) {
            return false;
        }
        delete entry.comparisonContext;
        this.store.set(conversationId.trim(), entry);
        return true;
    }
    /**
     * Applies deterministic constraint update operations (ADD, REPLACE, REMOVE, CLEAR_ALL).
     */
    static applyConstraintOperation(conversationId: string, operation: ConstraintUpdateOperation, incomingConstraints = [], now = Date.now()) {
        let entry = this.getPlaceContext(conversationId, now);
        if (!entry) {
            this.setPlaceContext({
                conversationId,
                structuredPlaces: [],
                ephemeralConstraints: [],
                now
            });
            entry = this.getPlaceContext(conversationId, now);
        }
        let current = entry.ephemeralConstraints ? [...entry.ephemeralConstraints] : [];
        switch (operation) {
            case ConstraintUpdateOperation.CLEAR_ALL:
                current = [];
                break;
            case ConstraintUpdateOperation.REMOVE:
                for (const inc of incomingConstraints) {
                    current = current.filter((c) => c.type !== inc.type);
                }
                break;
            case ConstraintUpdateOperation.REPLACE:
                for (const inc of incomingConstraints) {
                    current = current.filter((c) => c.type !== inc.type);
                    current.push(inc);
                }
                break;
            case ConstraintUpdateOperation.ADD:
            default:
                for (const inc of incomingConstraints) {
                    // If constraint of same type and property exists, replace; else append
                    const existingIdx = current.findIndex((c) => c.type === inc.type && (c.type !== ConstraintType.ACCESSIBILITY || c.targetAccessibility?.property === inc.targetAccessibility?.property));
                    if (existingIdx >= 0) {
                        current[existingIdx] = inc;
                    }
                    else {
                        current.push(inc);
                    }
                }
                break;
        }
        entry.ephemeralConstraints = current;
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            operation,
            constraintsCount: current.length
        }, "SessionPlaceStore: Applied constraint update operation");
        return current;
    }
    /**
     * Retrieves active ephemeral constraints for conversation.
     */
    static getEphemeralConstraints(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        return entry?.ephemeralConstraints ? [...entry.ephemeralConstraints] : [];
    }
    /**
     * Stores an ephemeral adaptation proposal in memory under the existing non-sliding TTL.
     */
    static setAdaptationProposal(conversationId: string, proposal: EphemeralItineraryProposal, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry) {
            this.setPlaceContext({
                conversationId,
                structuredPlaces: [],
                ephemeralAdaptationProposal: proposal,
                now
            });
            return true;
        }
        entry.ephemeralAdaptationProposal = proposal;
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            proposalId: proposal.proposalId,
            expectedItineraryVersion: proposal.expectedItineraryVersion
        }, "SessionPlaceStore: Stored ephemeral adaptation proposal");
        return true;
    }
    /**
     * Retrieves active ephemeral adaptation proposal if present and not expired.
     */
    static getAdaptationProposal(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.ephemeralAdaptationProposal) {
            return null;
        }
        return entry.ephemeralAdaptationProposal;
    }
    /**
     * Clears the ephemeral adaptation proposal.
     */
    static clearAdaptationProposal(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.ephemeralAdaptationProposal) {
            return false;
        }
        delete entry.ephemeralAdaptationProposal;
        this.store.set(conversationId.trim(), entry);
        return true;
    }
    /**
     * Clears ephemeral constraints for conversation.
     */
    static clearEphemeralConstraints(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry)
            return false;
        entry.ephemeralConstraints = [];
        this.store.set(conversationId.trim(), entry);
        return true;
    }
    /**
     * Explicitly clears the place context for a conversation.
     */
    static clearPlaceContext(conversationId: string) {
        if (!conversationId || typeof conversationId !== "string")
            return false;
        return this.store.delete(conversationId.trim());
    }
    /**
     * Alias for clearPlaceContext.
     */
    static clearSession(conversationId: string) {
        return this.clearPlaceContext(conversationId);
    }
    /**
     * Clears all entries across all conversations (useful for test isolation).
     */
    static clearAll() {
        this.store.clear();
    }
    /**
     * Stores or updates ephemeral trip execution context.
     * Note: This strictly caches transient state (activePlaceId, arrivalTimestamp, etc.)
     * It NEVER owns completion or skip state, which is authoritative in TripDocument.
     */
    static setExecutionContext(conversationId: string, context: EphemeralTripExecutionContext, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry) {
            this.setPlaceContext({
                conversationId,
                structuredPlaces: [],
                ephemeralExecutionContext: context,
                now
            });
            return true;
        }
        entry.ephemeralExecutionContext = context;
        this.store.set(conversationId.trim(), entry);
        logger.debug({
            conversationId,
            activePlaceId: context.activePlaceId,
            activeDayNumber: context.activeDayNumber
        }, "SessionPlaceStore: Stored ephemeral execution context");
        return true;
    }
    /**
     * Retrieves active ephemeral execution context if present and valid.
     */
    static getExecutionContext(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.ephemeralExecutionContext) {
            return null;
        }
        return entry.ephemeralExecutionContext;
    }
    /**
     * Clears the ephemeral execution context.
     */
    static clearExecutionContext(conversationId: string, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        if (!entry || !entry.ephemeralExecutionContext) {
            return false;
        }
        delete entry.ephemeralExecutionContext;
        this.store.set(conversationId.trim(), entry);
        return true;
    }
    /**
     * Explicitly updates the active place in the ephemeral execution context.
     */
    static updateActivePlace(conversationId: string, placeId: string, placeName: string, arrivalTimestamp: number, now = Date.now()) {
        const entry = this.getPlaceContext(conversationId, now);
        const existing = entry?.ephemeralExecutionContext;
        const updated = {
            ...(existing || {}),
            activePlaceId: placeId,
            activePlaceName: placeName,
            arrivalTimestamp: arrivalTimestamp !== undefined ? arrivalTimestamp : existing?.arrivalTimestamp,
            updatedAt: now
        };
        return this.setExecutionContext(conversationId, updated, now);
    }
    /**
     * Returns current count of cached active contexts.
     */
    static getActiveCount() {
        return this.store.size;
    }
}
