import mongoose, { Schema } from "mongoose";
import { Document, Types } from "mongoose";

export type ConversationStatus = "active" | "archived" | "paused";

export interface IActiveMenuOption {
    key: string;
    label: string;
    rawActionId: string;
}

export interface IActiveMenuContext {
    menuType: "itinerary_days" | "modification_options" | "language_picker" | "main_menu" | "active_trip" | "location_menu" | "help_menu" | "requirement_duration" | "requirement_travelers" | "requirement_budget" | "requirement_interests" | "requirement_pacing" | "trip_confirmation" | "trip_edit" | "wizard_destination" | "wizard_travel_date" | "wizard_custom_date" | "wizard_duration" | "wizard_custom_days" | "wizard_travelers" | "wizard_group_size" | "wizard_custom_travelers" | "wizard_budget" | "wizard_custom_budget" | "wizard_interests" | "wizard_pacing" | "wizard_confirmation" | "wizard_edit" | "weather_card" | "trip_cancel_confirm" | "location_discovery";
    tripId?: string;
    expectedVersion?: number;
    validOptions: IActiveMenuOption[];
    expiresAt: Date;
}

export interface IConversation {
    userId: Types.ObjectId | string;
    activeTripId?: Types.ObjectId | string;
    status: ConversationStatus;
    activeMenuContext?: IActiveMenuContext;
    pausedMenuContext?: IActiveMenuContext;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IConversationDocument extends IConversation, Document {
}

const ConversationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
        index: true
    },
    activeTripId: {
        type: Schema.Types.ObjectId,
        ref: "Trip"
    },
    status: {
        type: String,
        enum: ["active", "archived", "paused"],
        default: "active",
        index: true
    },
    activeMenuContext: {
        type: Schema.Types.Mixed
    },
    pausedMenuContext: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});
export const ConversationModel = (mongoose.models.Conversation as mongoose.Model<IConversationDocument>) ||
    mongoose.model<IConversationDocument>("Conversation", ConversationSchema);
