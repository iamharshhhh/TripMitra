import mongoose, { Schema } from "mongoose";
import { Document, Types } from "mongoose";

export type TripStatus = "planning" | "confirmed" | "active" | "completed" | "cancelled";

export interface ITrip {
    userId: Types.ObjectId | string;
    destination: string;
    destinationSlug: string;
    startDate?: Date;
    endDate?: Date;
    travelers: number;
    budget?: number;
    preferences?: Record<string, unknown>;
    requirements?: Record<string, unknown>;
    itinerary?: Array<Record<string, unknown>>;
    planningState?: any;
    itinerarySnapshot?: any;
    title?: string;
    version?: number;
    status: TripStatus;
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
}

export interface ITripDocument extends ITrip, Document {
    [key: string]: any;
}

const TripSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
        index: true
    },
    destination: {
        type: String,
        required: [true, "Destination is required"],
        trim: true
    },
    destinationSlug: {
        type: String,
        required: [true, "Destination slug is required"],
        trim: true,
        lowercase: true,
        index: true
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    travelers: {
        type: Number,
        default: 1,
        min: [1, "Travelers count must be at least 1"]
    },
    budget: {
        type: Number,
        min: [0, "Budget must be a positive number"]
    },
    preferences: {
        type: Schema.Types.Mixed,
        default: {}
    },
    requirements: {
        type: Schema.Types.Mixed,
        default: {}
    },
    itinerary: {
        type: [Schema.Types.Mixed],
        default: []
    },
    planningState: {
        type: String,
        default: "collecting_requirements"
    },
    itinerarySnapshot: {
        type: Schema.Types.Mixed
    },
    itineraryVersion: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ["planning", "confirmed", "active", "completed", "cancelled"],
        default: "planning",
        index: true
    }
}, {
    timestamps: true,
    strict: false
});
TripSchema.index({ userId: 1, status: 1 });
export const TripModel = (mongoose.models.Trip as mongoose.Model<ITripDocument>) || mongoose.model<ITripDocument>("Trip", TripSchema);
