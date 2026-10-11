import { isValidCoordinate, haversineDistanceMeters, geographicCenter } from "../../utils/geography.js";
import { logger } from "../../utils/logger.js";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { GeographicCluster } from "./itinerary-scheduling.types.js";

export interface GroupingResult {
    clusters: GeographicCluster[];
    unlocatableCandidates: CandidatePlace[];
}

export const DEFAULT_CLUSTER_RADIUS_METERS = 5000; // 5 km planning radius default
export class GeographicGroupingService {
    defaultRadiusMeters;
    constructor(defaultRadiusMeters = DEFAULT_CLUSTER_RADIUS_METERS) {
        this.defaultRadiusMeters = defaultRadiusMeters;
    }
    /**
     * Geographically groups ranked candidates into clusters using deterministic seed-and-radius grouping.
     * Candidates without valid coordinates are safely separated into unlocatableCandidates without fabricating coordinates.
     */
    groupCandidates(candidates: CandidatePlace[], clusterRadiusMeters: number) {
        const radius = clusterRadiusMeters ??
            (Number(process.env.ITINERARY_CLUSTER_RADIUS_METERS) || this.defaultRadiusMeters);
        const locatable = [];
        const unlocatableCandidates = [];
        // 1. Partition based on coordinate validity
        for (const candidate of candidates) {
            if (isValidCoordinate(candidate.location.latitude, candidate.location.longitude)) {
                locatable.push(candidate);
            }
            else {
                unlocatableCandidates.push(candidate);
            }
        }
        const clusters = [];
        const assignedIds = new Set();
        // 2. Greedy seed-based clustering preserving rank order
        let clusterIndex = 1;
        for (const seed of locatable) {
            if (assignedIds.has(seed.placeId)) {
                continue;
            }
            const clusterCandidateIds = [seed.placeId];
            const clusterPoints = [
                { latitude: seed.location.latitude, longitude: seed.location.longitude }
            ];
            assignedIds.add(seed.placeId);
            // Find nearby unassigned candidates within cluster radius
            for (const other of locatable) {
                if (assignedIds.has(other.placeId)) {
                    continue;
                }
                const dist = haversineDistanceMeters(seed.location.latitude, seed.location.longitude, other.location.latitude, other.location.longitude);
                if (dist <= radius) {
                    clusterCandidateIds.push(other.placeId);
                    clusterPoints.push({
                        latitude: other.location.latitude,
                        longitude: other.location.longitude
                    });
                    assignedIds.add(other.placeId);
                }
            }
            // 3. Compute cluster centroid
            const center = geographicCenter(clusterPoints);
            const neighborhood = seed.location.neighborhood;
            clusters.push({
                clusterId: `cluster-${clusterIndex++}`,
                center,
                candidateIds: clusterCandidateIds,
                neighborhood,
                totalCount: clusterCandidateIds.length
            });
        }
        logger.info({
            totalCandidates: candidates.length,
            locatableCount: locatable.length,
            unlocatableCount: unlocatableCandidates.length,
            clustersFormed: clusters.length,
            radiusMeters: radius
        }, "Geographic grouping completed");
        return {
            clusters,
            unlocatableCandidates
        };
    }
}
