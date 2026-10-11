import { UserPreferenceModel } from "../models/UserPreference.js";
import { IUserPreference, IPreferenceProvenance } from "../models/UserPreference.js";

export class UserPreferenceRepository {
    /**
     * Finds the user preference document for a given user ID.
     */
    static async findByUserId(userId: string) {
        if (!userId)
            return null;
        return UserPreferenceModel.findOne({ userId } as any).exec();
    }
    /**
     * Atomically upserts preferences and provenance for a given user ID.
     */
    static async upsertPreferences(userId: string, updates: Partial<IUserPreference>, provenanceItems: IPreferenceProvenance[]) {
        const existing = await UserPreferenceModel.findOne({ userId } as any).exec();
        if (!existing) {
            const doc = new UserPreferenceModel({
                userId,
                ...updates,
                provenance: provenanceItems
            });
            return doc.save();
        }
        // Merge provenance: update existing attribute provenance or append new
        const updatedProvenance = [...existing.provenance];
        for (const newProv of provenanceItems) {
            const idx = updatedProvenance.findIndex((p) => p.attribute === newProv.attribute);
            if (idx >= 0) {
                updatedProvenance[idx] = {
                    attribute: newProv.attribute,
                    source: newProv.source,
                    sourceTripId: newProv.sourceTripId || updatedProvenance[idx].sourceTripId,
                    confidence: "confirmed_explicit",
                    firstObservedAt: updatedProvenance[idx].firstObservedAt || newProv.firstObservedAt,
                    lastConfirmedAt: newProv.lastConfirmedAt
                };
            }
            else {
                updatedProvenance.push(newProv);
            }
        }
        // Apply updates
        if (updates.preferredPacing !== undefined)
            existing.preferredPacing = updates.preferredPacing;
        if (updates.maxDailyWalkingMeters !== undefined)
            existing.maxDailyWalkingMeters = updates.maxDailyWalkingMeters;
        if (updates.budgetTier !== undefined)
            existing.budgetTier = updates.budgetTier;
        if (updates.activityInterests !== undefined)
            existing.activityInterests = updates.activityInterests;
        if (updates.dietaryPreferences !== undefined)
            existing.dietaryPreferences = updates.dietaryPreferences;
        existing.provenance = updatedProvenance;
        return existing.save();
    }
    /**
     * Updates lastUsedAt timestamp without modifying lastConfirmedAt.
     */
    static async markUsed(userId: string, now = new Date()) {
        if (!userId)
            return null;
        return (UserPreferenceModel as any).findOneAndUpdate({ userId }, { $set: { lastUsedAt: now } }, { new: true }).exec();
    }
    /**
     * Explicitly removes or resets a specific preference attribute and its provenance.
     */
    static async clearAttribute(userId: string, attribute: string) {
        const existing = await UserPreferenceModel.findOne({ userId } as any).exec();
        if (!existing)
            return null;
        if (attribute === "preferredPacing")
            existing.preferredPacing = undefined;
        if (attribute === "maxDailyWalkingMeters")
            existing.maxDailyWalkingMeters = undefined;
        if (attribute === "budgetTier")
            existing.budgetTier = undefined;
        if (attribute === "activityInterests")
            existing.activityInterests = [];
        if (attribute === "dietaryPreferences")
            existing.dietaryPreferences = [];
        existing.provenance = existing.provenance.filter((p) => p.attribute !== attribute);
        return existing.save();
    }
    /**
     * Deletes all preference memory for a given user ID.
     */
    static async deleteByUserId(userId: string) {
        const res = await UserPreferenceModel.deleteOne({ userId }).exec();
        return res.deletedCount > 0;
    }
}
