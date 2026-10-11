import mongoose, { Schema } from "mongoose";
import { Document, Types } from "mongoose";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessageType = "text" | "quick_reply" | "location" | "interactive" | "template" | "image" | "audio";

export interface IInteractiveAudit {
    interactionType: "button_reply" | "list_reply";
    actionId: string;
    actionParameters?: Record<string, string | number>;
    rawPayload?: string;
}

export interface IMessage {
    conversationId: Types.ObjectId | string;
    role: MessageRole;
    content: string;
    messageType: MessageType;
    externalMessageId?: string;
    externalProvider?: "whatsapp" | "system" | "custom";
    toolCalls?: Array<Record<string, unknown>>;
    interactiveAudit?: IInteractiveAudit;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IMessageDocument extends IMessage, Document {
}

const MessageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: [true, "Conversation ID is required"],
        index: true
    },
    role: {
        type: String,
        enum: ["user", "assistant", "system", "tool"],
        required: [true, "Message role is required"]
    },
    content: {
        type: String,
        required: [true, "Message content is required"]
    },
    messageType: {
        type: String,
        enum: ["text", "quick_reply", "location", "interactive", "template", "image", "audio"],
        default: "text"
    },
    externalMessageId: {
        type: String,
        trim: true
    },
    externalProvider: {
        type: String,
        enum: ["whatsapp", "system", "custom"],
        default: "whatsapp"
    },
    toolCalls: {
        type: [Schema.Types.Mixed],
        default: []
    },
    interactiveAudit: {
        type: Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});
MessageSchema.index({ conversationId: 1, timestamp: -1 });
MessageSchema.index({ externalProvider: 1, externalMessageId: 1 }, {
    unique: true,
    partialFilterExpression: {
        externalMessageId: { $type: "string" }
    }
});
export const MessageModel = (mongoose.models.Message as mongoose.Model<IMessageDocument>) || mongoose.model<IMessageDocument>("Message", MessageSchema);
