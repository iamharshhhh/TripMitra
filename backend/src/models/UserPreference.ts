import mongoose, { Schema } from "mongoose";
import { Document, Types } from "mongoose";

export type PreferenceSource = "explicit_user_statement" | "wizard_selection" | "trip_requirement_confirmed";

export type PreferenceConfidence = "confirmed_explicit";

export interface IPreferenceProvenance {
    attribute: string;
    source: PreferenceSource;
    sourceTripId?: Types.ObjectId | string;
    confidence: PreferenceConfidence;
    firstObservedAt: Date;
    lastConfirmedAt: Date;
}

export interface IUserPreference {
    userId: Types.ObjectId | string;
    preferredPacing?: "relaxed" | "moderate" | "packed";
    maxDailyWalkingMeters?: number;
    budgetTier?: "budget" | "moderate" | "luxury";
    activityInterests?: string[];
    dietaryPreferences?: string[];
    provenance: IPreferenceProvenance[];
    lastUsedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserPreferenceDocument extends IUserPreference, Document {
}

const PreferenceProvenanceSchema = new Schema({
    attribute: {
        type: String,
        required: true,
        trim: true
    },
    source: {
        type: String,
        enum: [
            "explicit_user_statement",
            "wizard_selection",
            "trip_requirement_confirmed"
        ],
        required: true
    },
    sourceTripId: {
        type: Schema.Types.ObjectId,
        ref: "Trip"
    },
    confidence: {
        type: String,
        enum: ["confirmed_explicit"],
        default: "confirmed_explicit",
        required: true
    },
    firstObservedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    lastConfirmedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { _id: false });
const UserPreferenceSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
        unique: true,
        index: true
    },
    preferredPacing: {
        type: String,
        enum: ["relaxed", "moderate", "packed"]
    },
    maxDailyWalkingMeters: {
        type: Number,
        min: [100, "Walking distance must be at least 100 meters"]
    },
    budgetTier: {
        type: String,
        enum: ["budget", "moderate", "luxury"]
    },
    activityInterests: {
        type: [String],
        default: []
    },
    dietaryPreferences: {
        type: [String],
        default: []
    },
    provenance: {
        type: [PreferenceProvenanceSchema],
        default: []
    },
    lastUsedAt: {
        type: Date
    }
}, {
    timestamps: true
});
UserPreferenceSchema.index({ userId: 1 }, { unique: true });
UserPreferenceSchema.index({ updatedAt: 1 });
export const UserPreferenceModel = mongoose.models.UserPreference ||
    mongoose.model("UserPreference", UserPreferenceSchema);
