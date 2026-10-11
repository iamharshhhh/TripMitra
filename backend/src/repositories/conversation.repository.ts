import { ConversationModel } from "../models/Conversation.js";
import { IConversation, ConversationStatus, IActiveMenuContext } from "../models/Conversation.js";

export class ConversationRepository {
    static async findById(id: string) {
        return ConversationModel.findById(id).exec();
    }
    static async findByUserId(userId: string) {
        return ConversationModel.find({ userId }).sort({ updatedAt: -1 }).exec();
    }
    static async findActiveByUserId(userId: string) {
        return ConversationModel.findOne({ userId, status: "active" }).sort({ updatedAt: -1 }).exec();
    }
    static async create(conversationData: IConversation) {
        const conversation = new ConversationModel(conversationData);
        return conversation.save();
    }
    static async updateStatus(id: string, status: ConversationStatus) {
        return ConversationModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
    }
    static async updateActiveTrip(id: string, activeTripId: string) {
        const update = activeTripId ? { $set: { activeTripId } } : { $unset: { activeTripId: 1 } };
        return ConversationModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }
    static async updateActivity(id: string, activeTripId?: string) {
        const update: any = { updatedAt: new Date() };
        if (activeTripId) {
            update.activeTripId = activeTripId;
        }
        return ConversationModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
    }
    static async updateActiveMenuContext(id: string, activeMenuContext: IActiveMenuContext) {
        if (activeMenuContext) {
            const ttlSeconds = (activeMenuContext as any).ttlSeconds || 600;
            const expiresAt = activeMenuContext.expiresAt || new Date(Date.now() + ttlSeconds * 1000);
            const contextToSave = {
                ...activeMenuContext,
                expiresAt
            };
            return ConversationModel.findByIdAndUpdate(id, { $set: { activeMenuContext: contextToSave, updatedAt: new Date() } }, { new: true }).exec();
        }
        return ConversationModel.findByIdAndUpdate(id, { $unset: { activeMenuContext: 1 }, $set: { updatedAt: new Date() } }, { new: true }).exec();
    }
    static async clearActiveMenuContext(id: string) {
        return this.updateActiveMenuContext(id, undefined);
    }
    /**
     * Moves current activeMenuContext to pausedMenuContext and clears activeMenuContext.
     * Only minimal wizard context state is stored (menuType, tripId, validOptions, expiresAt).
     * Will NOT overwrite an existing pausedMenuContext during multiple topic switches.
     */
    static async pauseActiveMenuContext(id: string) {
        const conv = await ConversationModel.findById(id).exec();
        if (!conv || !conv.activeMenuContext)
            return conv;
        // Minimal state snapshot only: no history, no LLM output, no GPS/location data
        const minimalSnapshot = {
            menuType: conv.activeMenuContext.menuType,
            tripId: conv.activeMenuContext.tripId,
            expectedVersion: conv.activeMenuContext.expectedVersion,
            validOptions: conv.activeMenuContext.validOptions || [],
            expiresAt: conv.activeMenuContext.expiresAt
        };
        // If pausedMenuContext already exists (e.g. from an earlier topic switch), preserve it!
        const update: any = {
            $unset: { activeMenuContext: 1 },
            $set: { updatedAt: new Date() }
        };
        if (!conv.pausedMenuContext) {
            update.$set.pausedMenuContext = minimalSnapshot;
        }
        return ConversationModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }
    /**
     * Restores pausedMenuContext to activeMenuContext and clears pausedMenuContext.
     */
    static async resumePausedMenuContext(id: string) {
        const conv = await ConversationModel.findById(id).exec();
        if (!conv || !conv.pausedMenuContext)
            return conv;
        const restoredContext = conv.pausedMenuContext;
        return ConversationModel.findByIdAndUpdate(id, {
            $set: { activeMenuContext: restoredContext, updatedAt: new Date() },
            $unset: { pausedMenuContext: 1 }
        }, { new: true }).exec();
    }
    /**
     * Clears pausedMenuContext.
     */
    static async clearPausedMenuContext(id: string) {
        return ConversationModel.findByIdAndUpdate(id, { $unset: { pausedMenuContext: 1 }, $set: { updatedAt: new Date() } }, { new: true }).exec();
    }
}
