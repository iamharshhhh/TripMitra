import { MessageModel } from "../models/Message.js";
import { IMessage } from "../models/Message.js";

export class MessageRepository {
    static async findById(id: string) {
        return MessageModel.findById(id).exec();
    }
    static async findByExternalId(externalMessageId: string, externalProvider = "whatsapp") {
        return MessageModel.findOne({ externalMessageId, externalProvider } as any).exec();
    }
    static async findByConversationId(conversationId: string, limit = 20) {
        return MessageModel.find({ conversationId }).sort({ timestamp: -1 }).limit(limit).exec();
    }
    static async create(messageData: IMessage) {
        const message = new MessageModel(messageData);
        return message.save();
    }
}
