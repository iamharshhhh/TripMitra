import { WhatsAppMediaService } from "./vision/whatsapp-media.service.js";
import { LiveLocationService } from "./location/live-location.service.js";
import { GeminiVisionService } from "./vision/gemini-vision.service.js";
import { LandmarkResolutionService } from "./vision/landmark-resolution.service.js";
import { MultimodalVisionChatbotService } from "./vision/multimodal-vision-chatbot.service.js";
import { SessionVisualStore } from "./vision/session-visual.store.js";
import { TransactionGuardService } from "./travel/transaction-guard.service.js";
import { SessionLocationStore } from "./location/session-location.store.js";
import { isValidCoordinate } from "../utils/geography.js";
import { env } from "../config/env.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ConversationRepository } from "../repositories/conversation.repository.js";
import { MessageRepository } from "../repositories/message.repository.js";
import { WhatsAppService } from "./whatsapp.service.js";
import { WhatsAppInteractiveService } from "./whatsapp-ui/whatsapp-interactive.service.js";
import { WhatsAppActionParser } from "./whatsapp-ui/whatsapp-action.parser.js";
import { WhatsAppActionHandler } from "./whatsapp-ui/whatsapp-action.handler.js";
import { ConversationalIntentRouter } from "./routing/conversational-intent-router.service.js";
import { TypedAction } from "./whatsapp-ui/whatsapp-ui.types.js";
import { TravelAgent } from "../agents/travelAgent.js";
import { TripMitraChatbotService } from "./travel/tripmitra-chatbot.service.js";
import { NamedLocationService } from "./location/named-location.service.js";
import { LocationPlacesDiscoveryService } from "./travel/location-places-discovery.service.js";
import { PlaceContinuityService } from "./travel/place-continuity.service.js";
import { MULTILINGUAL_UI_STRINGS } from "./whatsapp-ui/whatsapp-ui.strings.js";
import { LanguageUnderstandingService } from "./language/language-understanding.service.js";
import { logger } from "../utils/logger.js";

export const AUDIO_UNSUPPORTED_NOTICE = {
    en: "TripMitra is a text-based travel assistant and does not support voice notes. Please type your message in text!",
    hi: "TripMitra केवल टेक्स्ट संदेशों का समर्थन करता है। कृपया अपना संदेश लिखकर भेजें!",
    mr: "TripMitra फक्त मजकूर संदेशांना समर्थन देतो. कृपया आपला संदेश लिहून पाठवा!"
};

export const FALLBACK_AI_ERROR_MESSAGE = "I'm having trouble processing your request right now. Please try again in a moment.";

export interface ProcessWebhookResult {
    processed: boolean;
    messageCount: number;
    duplicateCount: number;
    unsupportedCount: number;
}

export interface WhatsAppContact {
    profile?: {
        name?: string;
    };
    wa_id?: string;
}

export interface WhatsAppIncomingMessage {
    from: string;
    id: string;
    timestamp?: string;
    type: string;
    text?: {
        body: string;
    };
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
    };
    image?: {
        id: string;
        mime_type?: string;
        caption?: string;
    };
}

export interface WhatsAppChangeValue {
    messaging_product?: string;
    metadata?: {
        display_phone_number?: string;
        phone_number_id?: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppIncomingMessage[];
    statuses?: Array<Record<string, unknown>>;
}

export interface WhatsAppWebhookEntry {
    id?: string;
    changes?: Array<{
        value?: WhatsAppChangeValue;
        field?: string;
    }>;
}

export interface WhatsAppWebhookPayload {
    object?: string;
    entry?: WhatsAppWebhookEntry[];
}

export interface ProcessAiJobParams {
    conversationId: string;
    userId: string;
    phoneNumber: string;
    userMessage: string;
    incomingMessageId: string;
    activeLanguage?: string;
    isLocationPin?: boolean;
    isLocationMessage?: boolean;
    isImageMessage?: boolean;
    mediaId?: string;
    declaredMime?: string;
    caption?: string;
    isInteractive?: boolean;
    rawActionId?: string;
}

export class WhatsAppMessageService {
    public static liveLocationService: LiveLocationService = new LiveLocationService();
    public static geminiVisionService: GeminiVisionService = new GeminiVisionService();
    public static landmarkResolutionService: LandmarkResolutionService = new LandmarkResolutionService();
    public static multimodalVisionService: MultimodalVisionChatbotService = new MultimodalVisionChatbotService();
    public static locationPlacesDiscoveryService: LocationPlacesDiscoveryService = new LocationPlacesDiscoveryService();
    public static placeContinuityService: PlaceContinuityService = new PlaceContinuityService();
    static travelAgent = TripMitraChatbotService.travelAgent;
    static activeInboundMessageIds = new Set<string>();

    static async processIncomingWebhook(payload: WhatsAppWebhookPayload | Record<string, unknown>) {
        const result = {
            processed: true,
            messageCount: 0,
            duplicateCount: 0,
            unsupportedCount: 0
        };

        if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
            logger.debug("Received non-WhatsApp webhook event or empty payload");
            return result;
        }

        for (const entry of payload.entry) {
            if (!Array.isArray(entry.changes))
                continue;
            for (const change of entry.changes) {
                const value = change.value;
                if (!value || change.field !== "messages")
                    continue;
                if (Array.isArray(value.statuses) && value.statuses.length > 0) {
                    logger.debug({ count: value.statuses.length }, "Received WhatsApp status update");
                    continue;
                }
                const messages = value.messages;
                if (!Array.isArray(messages) || messages.length === 0)
                    continue;
                const contacts = value.contacts || [];

                for (const msg of messages) {
                    result.messageCount++;
                    const rawPhone = msg.from;
                    const externalMessageId = msg.id;
                    const senderName = contacts.find((c) => c.wa_id === rawPhone)?.profile?.name;
                    const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;

                    if (msg.type !== "text" && msg.type !== "location" && msg.type !== "image" && msg.type !== "interactive" && msg.type !== "audio" && msg.type !== "voice") {
                        logger.info({ type: msg.type, from: msg.from, messageId: msg.id }, "Received unsupported WhatsApp message type (ignoring)");
                        result.unsupportedCount++;
                        continue;
                    }

                    if (this.activeInboundMessageIds.has(externalMessageId)) {
                        result.duplicateCount++;
                        logger.warn({ externalMessageId, reason: "in_memory_lock" }, "Duplicate webhook message blocked");
                        continue;
                    }
                    const existingMessage = await MessageRepository.findByExternalId(externalMessageId, "whatsapp");
                    if (existingMessage) {
                        result.duplicateCount++;
                        logger.warn({ externalMessageId, reason: "persisted_duplicate" }, "Duplicate webhook message blocked");
                        continue;
                    }

                    this.activeInboundMessageIds.add(externalMessageId);

                    let user = await UserRepository.findByPhoneNumber(formattedPhone);
                    if (!user) {
                        user = await UserRepository.create({
                            phoneNumber: formattedPhone,
                            name: senderName,
                            language: "en"
                        });
                    } else if (senderName && !user.name) {
                        await UserRepository.update(user._id.toString(), { name: senderName });
                    }

                    let conversation = await ConversationRepository.findActiveByUserId(user._id.toString());
                    if (!conversation) {
                        conversation = await ConversationRepository.create({
                            userId: user._id,
                            status: "active"
                        });
                    }

                    const activeLanguage = user.language || "en";

                    if (msg.type === "interactive" && msg.interactive) {
                        const rawActionId = msg.interactive.button_reply?.id || msg.interactive.list_reply?.id || "";
                        const actionTitle = msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || "";
                        const interactionType = msg.interactive.type || (msg.interactive.button_reply ? "button_reply" : "list_reply");
                        const parsedAction = WhatsAppActionParser.parse(rawActionId);

                        try {
                            await MessageRepository.create({
                                conversationId: conversation._id,
                                role: "user",
                                content: actionTitle || rawActionId,
                                messageType: "interactive",
                                interactiveAudit: {
                                    interactionType,
                                    actionId: parsedAction.type,
                                    rawPayload: rawActionId
                                },
                                externalMessageId,
                                externalProvider: "whatsapp",
                                timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
                            });
                        } catch (err) {
                            if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
                                result.duplicateCount++;
                                logger.warn({ externalMessageId, reason: "mongo_unique_index_race" }, "Duplicate webhook message blocked");
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            }
                            throw err;
                        }

                        await ConversationRepository.updateActivity(conversation._id.toString());
                        try {
                            const parsedAction = WhatsAppActionParser.parse(rawActionId);
                            const handlerResult = await WhatsAppActionHandler.handleAction({
                                action: parsedAction as any,
                                userId: user._id.toString(),
                                conversationId: conversation._id.toString(),
                                phoneNumber: formattedPhone,
                                activeLanguage: activeLanguage as any
                            });

                            const res: any = handlerResult;
                            if (res) {
                                if (res.menuContextToSet) {
                                    await ConversationRepository.updateActiveMenuContext(conversation._id.toString(), res.menuContextToSet);
                                }
                                const interactiveBody = res.interactivePayload?.interactive?.body?.text?.trim();
                                const outgoingTextMessages = (res.textMessages || []).filter((m: string) => !interactiveBody || m.trim() !== interactiveBody);
                                if (outgoingTextMessages.length) {
                                    for (const msgText of outgoingTextMessages) {
                                        await WhatsAppService.sendTextMessage(formattedPhone, msgText);
                                    }
                                } else if (res.fallbackText && !res.interactivePayload) {
                                    await WhatsAppService.sendTextMessage(formattedPhone, res.fallbackText);
                                }
                                if (res.interactivePayload) {
                                    await WhatsAppService.sendInteractiveMessage(formattedPhone, res.interactivePayload);
                                }
                            }
                        } catch (actionErr) {
                            logger.error({ err: actionErr instanceof Error ? actionErr.message : actionErr, rawActionId }, "Failed to execute interactive action; sending main menu fallback");
                            const fallbackMenu = WhatsAppInteractiveService.sendMainMenu(formattedPhone, activeLanguage);
                            if (fallbackMenu.interactivePayload) {
                                await WhatsAppService.sendInteractiveMessage(formattedPhone, fallbackMenu.interactivePayload);
                            }
                        } finally {
                            this.activeInboundMessageIds.delete(externalMessageId);
                        }
                        continue;
                    }

                    if (msg.type === "location" && msg.location) {
                        if (!isValidCoordinate(msg.location.latitude, msg.location.longitude)) {
                            logger.info({ from: msg.from, messageId: msg.id }, "Received location message with invalid coordinates (ignoring)");
                            result.unsupportedCount++;
                            this.activeInboundMessageIds.delete(externalMessageId);
                            continue;
                        }

                        SessionLocationStore.setLocation(
                            conversation._id.toString(),
                            msg.location.latitude,
                            msg.location.longitude,
                            msg.location.name || "",
                            msg.location.address || ""
                        );

                        try {
                            await MessageRepository.create({
                                conversationId: conversation._id,
                                role: "user",
                                content: "[Shared Location Pin]",
                                messageType: "location",
                                externalMessageId,
                                externalProvider: "whatsapp",
                                timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
                            });
                        } catch (err) {
                            if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
                                result.duplicateCount++;
                                logger.warn({ externalMessageId, reason: "mongo_unique_index_race" }, "Duplicate webhook message blocked");
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            }
                            throw err;
                        }

                        await ConversationRepository.updateActivity(conversation._id.toString());
                        this.processAiResponseAsync({
                            conversationId: conversation._id.toString(),
                            userId: user._id.toString(),
                            phoneNumber: formattedPhone,
                            userMessage: "[Shared Location Pin]",
                            incomingMessageId: externalMessageId,
                            isLocationPin: true,
                            isLocationMessage: true,
                            activeLanguage
                        })
                        .catch((bgErr) => {
                            logger.error({ err: bgErr instanceof Error ? bgErr.message : bgErr, externalMessageId }, "Unhandled error in background location task");
                        })
                        .finally(() => {
                            this.activeInboundMessageIds.delete(externalMessageId);
                        });

                    } else if (msg.type === "image" && msg.image) {
                        try {
                            await MessageRepository.create({
                                conversationId: conversation._id,
                                role: "user",
                                content: "[Image Received]",
                                messageType: "image",
                                externalMessageId,
                                externalProvider: "whatsapp",
                                timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
                            });
                        } catch (err) {
                            if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
                                result.duplicateCount++;
                                logger.warn({ externalMessageId, reason: "mongo_unique_index_race" }, "Duplicate webhook message blocked");
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            }
                            throw err;
                        }

                        await ConversationRepository.updateActivity(conversation._id.toString());
                        this.processAiResponseAsync({
                            conversationId: conversation._id.toString(),
                            userId: user._id.toString(),
                            phoneNumber: formattedPhone,
                            userMessage: msg.image.caption || "[Image Received]",
                            incomingMessageId: externalMessageId,
                            isImageMessage: true,
                            mediaId: msg.image.id,
                            declaredMime: msg.image.mime_type,
                            caption: msg.image.caption,
                            activeLanguage
                        })
                        .catch((bgErr) => {
                            logger.error({ err: bgErr instanceof Error ? bgErr.message : bgErr, externalMessageId }, "Unhandled error in background vision task");
                        })
                        .finally(() => {
                            this.activeInboundMessageIds.delete(externalMessageId);
                        });

                    } else if ((msg.type === "audio" || msg.type === "voice") && (msg.audio || msg.voice)) {
                        try {
                            await MessageRepository.create({
                                conversationId: conversation._id,
                                role: "user",
                                content: "[Voice Message Received]",
                                messageType: "audio",
                                externalMessageId,
                                externalProvider: "whatsapp",
                                timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
                            });
                        } catch (err) {
                            if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
                                result.duplicateCount++;
                                logger.warn({ externalMessageId, reason: "mongo_unique_index_race" }, "Duplicate webhook message blocked");
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            }
                            throw err;
                        }

                        await ConversationRepository.updateActivity(conversation._id.toString());
                        const noticeText = AUDIO_UNSUPPORTED_NOTICE[activeLanguage as keyof typeof AUDIO_UNSUPPORTED_NOTICE] || AUDIO_UNSUPPORTED_NOTICE.en;
                        await MessageRepository.create({
                            conversationId: conversation._id,
                            role: "assistant",
                            content: noticeText,
                            messageType: "text",
                            timestamp: new Date()
                        });
                        await WhatsAppService.sendTextMessage(formattedPhone, noticeText);
                        this.activeInboundMessageIds.delete(externalMessageId);
                        continue;

                    } else if (msg.type === "text" && msg.text?.body) {
                        const textContent = msg.text.body.trim();

                        if (/clear\s*(?:my\s*)?location/i.test(textContent)) {
                            SessionLocationStore.clearLocation(conversation._id.toString());
                        }

                        try {
                            await MessageRepository.create({
                                conversationId: conversation._id,
                                role: "user",
                                content: textContent,
                                messageType: "text",
                                externalMessageId,
                                externalProvider: "whatsapp",
                                timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date()
                            });
                        } catch (err) {
                            if (typeof err === "object" && err !== null && "code" in err && (err as any).code === 11000) {
                                result.duplicateCount++;
                                logger.warn({ externalMessageId, reason: "mongo_unique_index_race" }, "Duplicate webhook message blocked");
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            }
                            throw err;
                        }

                        await ConversationRepository.updateActivity(conversation._id.toString());

                        const validOpts = conversation.activeMenuContext?.validOptions || [];
                        const matchedOpt = validOpts.find((o) => o.key === textContent || o.label.toLowerCase() === textContent.toLowerCase());
                        if (matchedOpt && matchedOpt.rawActionId) {
                            try {
                                const parsedAction = WhatsAppActionParser.parse(matchedOpt.rawActionId);
                                const handlerResult = await WhatsAppActionHandler.handleAction({
                                    action: parsedAction as any,
                                    userId: user._id.toString(),
                                    conversationId: conversation._id.toString(),
                                    phoneNumber: formattedPhone,
                                    activeLanguage: activeLanguage as any
                                });
                                const res: any = handlerResult;
                                if (res) {
                                    if (res.menuContextToSet) {
                                        await ConversationRepository.updateActiveMenuContext(conversation._id.toString(), res.menuContextToSet);
                                    }
                                    const interactiveBody = res.interactivePayload?.interactive?.body?.text?.trim();
                                    const outgoingTextMessages = (res.textMessages || []).filter((m: string) => !interactiveBody || m.trim() !== interactiveBody);
                                    if (outgoingTextMessages.length) {
                                        for (const msgText of outgoingTextMessages) {
                                            await WhatsAppService.sendTextMessage(formattedPhone, msgText);
                                        }
                                    } else if (res.fallbackText && !res.interactivePayload) {
                                        await WhatsAppService.sendTextMessage(formattedPhone, res.fallbackText);
                                    }
                                    if (res.interactivePayload) {
                                        await WhatsAppService.sendInteractiveMessage(formattedPhone, res.interactivePayload);
                                    }
                                }
                                this.activeInboundMessageIds.delete(externalMessageId);
                                continue;
                            } catch (err) {
                                logger.warn({ rawActionId: matchedOpt.rawActionId }, "Fallback menu numeric action execution failed; passing to AI handler");
                            }
                        }
                        this.processAiResponseAsync({
                            conversationId: conversation._id.toString(),
                            userId: user._id.toString(),
                            phoneNumber: formattedPhone,
                            userMessage: textContent,
                            incomingMessageId: externalMessageId,
                            activeLanguage
                        })
                        .catch((bgErr) => {
                            logger.error({ err: bgErr instanceof Error ? bgErr.message : bgErr, externalMessageId }, "Unhandled error in background AI response task");
                        })
                        .finally(() => {
                            this.activeInboundMessageIds.delete(externalMessageId);
                        });
                    }
                }
            }
        }
        return result;
    }

    static async processAiJob(params: ProcessAiJobParams) {
        const {
            conversationId,
            userId,
            phoneNumber,
            userMessage,
            isLocationPin,
            isLocationMessage,
            isImageMessage,
            mediaId,
            declaredMime,
            caption,
            activeLanguage: initialLanguage,
            incomingMessageId,
            rawActionId
        } = params;

        const activeLanguage = initialLanguage;
        let responseText: string;
        const effectiveUserMessage = userMessage;

        if (rawActionId) {
            try {
                const parsedAction = WhatsAppActionParser.parse(rawActionId);
                const handlerResult: any = await WhatsAppActionHandler.handleAction({
                    action: parsedAction as any,
                    userId,
                    conversationId,
                    phoneNumber,
                    activeLanguage: (activeLanguage || "en") as any
                });
                if (handlerResult) {
                    if (handlerResult.menuContextToSet) {
                        await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                    }
                    const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                    if (sentContent) {
                        await MessageRepository.create({
                            conversationId,
                            role: "assistant",
                            content: sentContent,
                            messageType: handlerResult.interactivePayload ? "interactive" : "text",
                            timestamp: new Date()
                        });
                    }
                    const interactiveBody = handlerResult.interactivePayload?.interactive?.body?.text?.trim();
                    const outgoingTextMessages = (handlerResult.textMessages || []).filter((m: string) => !interactiveBody || m.trim() !== interactiveBody);
                    if (outgoingTextMessages.length) {
                        for (const msgText of outgoingTextMessages) {
                            await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                        }
                    } else if (sentContent && !handlerResult.interactivePayload) {
                        await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                    }
                    if (handlerResult.interactivePayload) {
                        await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                    }
                    return;
                }
            } catch (err) {
                logger.warn({ rawActionId }, "Failed to execute rawActionId in processAiJob");
            }
        }

        const conversationForOpt = await ConversationRepository.findById(conversationId);
        const validOpts = conversationForOpt?.activeMenuContext?.validOptions || [];
        const matchedOpt = validOpts.find((o) => o.key === userMessage.trim() || o.label.toLowerCase() === userMessage.trim().toLowerCase());
        if (matchedOpt && matchedOpt.rawActionId && conversationForOpt?.activeMenuContext?.expiresAt && new Date(conversationForOpt.activeMenuContext.expiresAt) > new Date()) {
            try {
                const parsedAction = WhatsAppActionParser.parse(matchedOpt.rawActionId);
                const handlerResult: any = await WhatsAppActionHandler.handleAction({
                    action: parsedAction as any,
                    userId,
                    conversationId,
                    phoneNumber,
                    activeLanguage: (activeLanguage || "en") as any
                });
                if (handlerResult) {
                    if (handlerResult.menuContextToSet) {
                        await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                    }
                    const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                    if (sentContent) {
                        await MessageRepository.create({
                            conversationId,
                            role: "assistant",
                            content: sentContent,
                            messageType: handlerResult.interactivePayload ? "interactive" : "text",
                            timestamp: new Date()
                        });
                    }
                    if (handlerResult.textMessages?.length) {
                        for (const msgText of handlerResult.textMessages) {
                            await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                        }
                    } else if (sentContent && !handlerResult.interactivePayload) {
                        await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                    }
                    if (handlerResult.interactivePayload) {
                        await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                    }
                    return;
                }
            } catch (err) {
                logger.warn({ matchedOpt }, "Failed to execute matchedOpt in processAiJob");
            }
        }

        const normalizedMsg = (effectiveUserMessage || userMessage || "").trim().toLowerCase();
        const cleanMsg = normalizedMsg.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}!.,?]/gu, "").trim();
        const isGreeting = /^(hi+|hello|hey|start|menu|main menu|home|hola|namaste|good morning|good evening|नमस्ते|नमस्कार|हॅलो|हाय|शुरू|शुरु|मेनू)$/i.test(cleanMsg) || /^(hi+|hello|hey|start|menu|main menu|home|hola|namaste|good morning|good evening|नमस्ते|नमस्कार|हॅलो|हाय|शुरू|शुरु|मेनू)$/i.test(normalizedMsg);

        if (isGreeting) {
            const menuResult = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage || "en");
            if (menuResult.menuContextToSet) {
                await ConversationRepository.updateActiveMenuContext(conversationId, menuResult.menuContextToSet as any);
            }
            const sentContent = menuResult.fallbackText;
            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: sentContent,
                messageType: "interactive",
                timestamp: new Date()
            });

            if (menuResult.interactivePayload) {
                await WhatsAppService.sendInteractiveMessage(phoneNumber, menuResult.interactivePayload);
            } else {
                await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
            }
            return;
        }

        if (isLocationPin || isLocationMessage) {
            const locResult = await this.liveLocationService.evaluateLiveLocation({
                conversationId,
                userId,
                language: (activeLanguage || "en") as any
            });
            responseText = (locResult as any).formattedMessage || (locResult as any).replyText || "📍 Location pin received.";

            const menuResult = WhatsAppInteractiveService.sendLocationDiscoveryMenu(
                phoneNumber,
                (activeLanguage || "en") as any,
                responseText
            );

            if (menuResult.menuContextToSet) {
                await ConversationRepository.updateActiveMenuContext(conversationId, menuResult.menuContextToSet as any);
            }

            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: responseText,
                messageType: "interactive",
                timestamp: new Date()
            });

            if (menuResult.textMessages?.length) {
                for (const msgText of menuResult.textMessages) {
                    await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                }
            }
            if (menuResult.interactivePayload) {
                await WhatsAppService.sendInteractiveMessage(phoneNumber, menuResult.interactivePayload);
            } else {
                await WhatsAppService.sendTextMessage(phoneNumber, menuResult.fallbackText || responseText);
            }
            return;
        }

        if (isImageMessage && mediaId) {
            const visionResult = await WhatsAppMessageService.multimodalVisionService.processIncomingImage({
                conversationId,
                userId,
                phoneNumber,
                mediaId,
                declaredMime,
                caption,
                activeLanguage: (activeLanguage || "en") as any
            });

            responseText = visionResult.responseText;

            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: responseText,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, responseText);
            return;
        }

        const visualContext = SessionVisualStore.getContext(conversationId);
        let targetMsg = effectiveUserMessage || userMessage;
        if (visualContext) {
            const isFollowUp = /\b(this|it|here|the place|the train|the bus|the menu|the dish|the food|timing|time|ticket|seat|cost|price|history|reach|directions|departure|arrival|platform|हे|या|इथे|तिकीट|वेळ|गाडी|का|यह|यहाँ|स्थान|टिकट|समय|ट्रेन|पहुंच|दिशा)\b/i.test(targetMsg);
            const isLandmarkIdFollowUp = visualContext.detectedType === "landmark" && (
                /\b(name of (this|the)|what (is|was) (this|that|the) place|which place|what place|where is (this|it)|identify|place name|tell me about (this|the place)|हे ठिकाण|नाव काय|काय आहे|कोणती जागा|यह कौन सी जगह|नाम क्या|क्या है|जगह का नाम|ठिकाणाचे नाव)\b/i.test(targetMsg)
            );

            if (isLandmarkIdFollowUp) {
                if (visualContext.candidateName) {
                    const resolution = await WhatsAppMessageService.landmarkResolutionService.resolveLandmark({
                        visionResponse: {
                            candidateName: visualContext.candidateName,
                            candidateCategory: (visualContext.candidateCategory as any) || "other",
                            identificationStatus: (visualContext.confidence === "high" || visualContext.confidence === "probable") ? "identified" : "probable",
                            confidence: (visualContext.confidence as any) || "high",
                            confidenceScore: 0.9,
                            visualClues: visualContext.visualClues,
                            reasoningSummary: visualContext.extractedSummary
                        },
                        conversationId,
                        language: (activeLanguage || "en") as any
                    });

                    const replyText = resolution.formattedMessage;
                    await MessageRepository.create({
                        conversationId,
                        role: "assistant",
                        content: replyText,
                        messageType: "text",
                        timestamp: new Date()
                    });
                    await WhatsAppService.sendTextMessage(phoneNumber, replyText);
                    return;
                } else if (visualContext.buffer && visualContext.mimeType) {
                    try {
                        const reVision = await WhatsAppMessageService.geminiVisionService.analyzeMultimodalImage({
                            buffer: visualContext.buffer,
                            mimeType: visualContext.mimeType,
                            caption: targetMsg,
                            userQuestion: targetMsg
                        });

                        SessionVisualStore.setContext(conversationId, {
                            ...visualContext,
                            candidateName: reVision.candidateName,
                            candidateCategory: reVision.candidateCategory,
                            visualClues: reVision.visualClues || visualContext.visualClues,
                            extractedSummary: reVision.reasoningSummary || visualContext.extractedSummary,
                            confidence: reVision.confidence
                        });

                        if (reVision.candidateName) {
                            const resolution = await WhatsAppMessageService.landmarkResolutionService.resolveLandmark({
                                visionResponse: reVision as any,
                                conversationId,
                                language: (activeLanguage || "en") as any
                            });
                            const replyText = resolution.formattedMessage;
                            await MessageRepository.create({
                                conversationId,
                                role: "assistant",
                                content: replyText,
                                messageType: "text",
                                timestamp: new Date()
                            });
                            await WhatsAppService.sendTextMessage(phoneNumber, replyText);
                            return;
                        }
                    } catch (reErr) {
                        logger.warn({ err: reErr }, "Follow-up vision re-analysis failed");
                    }
                }
            }

            if (isFollowUp) {
                let contextNote = `[Visual Context: ${visualContext.detectedType}`;
                if (visualContext.candidateName) contextNote += ` - ${visualContext.candidateName}`;
                if (visualContext.visualClues?.length) contextNote += ` (Features: ${visualContext.visualClues.join(", ")})`;
                if (visualContext.documentDetails) {
                    const d = visualContext.documentDetails;
                    contextNote += ` (${[d.operator, d.serviceNumber, d.origin, "->", d.destination, d.departureTime].filter(Boolean).join(" ")})`;
                }
                if (visualContext.menuDetails && visualContext.menuDetails.vegetarianItems.length > 0) {
                    contextNote += ` (Vegetarian items: ${visualContext.menuDetails.vegetarianItems.slice(0, 5).join(", ")})`;
                }
                contextNote += `]`;
                targetMsg = `${targetMsg}\n\n${contextNote}`;
            }
        }

        const transactionRefusal = TransactionGuardService.evaluateTransactionGuard(targetMsg, (activeLanguage || "en") as any);
        if (transactionRefusal && transactionRefusal.refused) {
            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: transactionRefusal.message,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, transactionRefusal.message);
            return;
        }

        if (TripMitraChatbotService.isOutOfScopeQuery(targetMsg)) {
            const strings = MULTILINGUAL_UI_STRINGS[(activeLanguage || "en") as keyof typeof MULTILINGUAL_UI_STRINGS] || MULTILINGUAL_UI_STRINGS.en;
            const refusal = strings.menuHeaders.chatbotRefusal;
            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: refusal,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, refusal);
            return;
        }

        const spatialRes: any = await WhatsAppMessageService.locationPlacesDiscoveryService.handleSpatialQuery({
            query: targetMsg,
            userMessage: targetMsg,
            conversationId,
            userId,
            language: (activeLanguage || "en") as any
        } as any);
        const spatialReply = spatialRes?.replyText || spatialRes?.formattedMessage;
        if (spatialRes?.handled && spatialReply) {
            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: spatialReply,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, spatialReply);
            return;
        }

        const continuityRes: any = await WhatsAppMessageService.placeContinuityService.handleContinuityQuery({
            query: targetMsg,
            userMessage: targetMsg,
            conversationId,
            userId,
            language: (activeLanguage || "en") as any
        } as any);
        const continuityReply = continuityRes?.replyText || continuityRes?.formattedMessage;
        if (continuityRes?.handled && continuityReply) {
            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: continuityReply,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, continuityReply);
            return;
        }

        const conversation = await ConversationRepository.findById(conversationId);
        const activeMenuContext = conversation?.activeMenuContext;
        const activeTrip = await WhatsAppActionHandler.resolveActiveTrip(conversationId, userId);

        const classification = ConversationalIntentRouter.classifyIntent({
            userMessage: targetMsg,
            activeMenuContext: activeMenuContext as any,
            pausedMenuContext: conversation?.pausedMenuContext as any,
            activeTrip
        });

        if (classification.intent === "WIZARD_STEP_ANSWER" && activeMenuContext && activeMenuContext.menuType && activeMenuContext.expiresAt && new Date(activeMenuContext.expiresAt) > new Date()) {
            const menuType = activeMenuContext.menuType;
            let wizardAction: TypedAction | null = null;

            if (menuType === "wizard_destination") {
                wizardAction = { type: "SET_DESTINATION", destination: userMessage.trim() };
            } else if (menuType === "wizard_travel_date" || menuType === "wizard_custom_date") {
                wizardAction = { type: "SET_TRAVEL_DATE", date: userMessage.trim() };
            } else if (menuType === "wizard_duration" || menuType === "wizard_custom_days") {
                const digits = userMessage.replace(/\D/g, "");
                const num = digits ? parseInt(digits, 10) : 3;
                wizardAction = { type: "SET_DURATION", durationDays: num };
            } else if (menuType === "wizard_travelers" || menuType === "wizard_custom_travelers" || menuType === "wizard_group_size") {
                const digits = userMessage.replace(/\D/g, "");
                const num = digits ? parseInt(digits, 10) : 2;
                wizardAction = { type: "SET_TRAVELERS", count: num };
            } else if (menuType === "wizard_budget" || menuType === "wizard_custom_budget") {
                const digits = userMessage.replace(/\D/g, "");
                const num = digits ? parseInt(digits, 10) : 0;
                if (menuType === "wizard_custom_budget" || (num > 0 && !["budget", "moderate", "luxury"].includes(userMessage.trim().toLowerCase()))) {
                    wizardAction = { type: "SET_BUDGET", category: "custom", amount: num || 30000 };
                } else {
                    wizardAction = { type: "SET_BUDGET", category: userMessage.trim().toLowerCase() };
                }
            } else if (menuType === "wizard_interests") {
                wizardAction = { type: "SET_INTERESTS", interests: userMessage.split(",").map((i) => i.trim()) };
            }

            if (wizardAction) {
                try {
                    const handlerResult: any = await WhatsAppActionHandler.handleAction({
                        action: wizardAction,
                        userId,
                        conversationId,
                        phoneNumber,
                        activeLanguage: (activeLanguage || "en") as any
                    });
                    if (handlerResult) {
                        if (handlerResult.menuContextToSet) {
                            await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                        }
                        const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                        if (sentContent) {
                            await MessageRepository.create({
                                conversationId,
                                role: "assistant",
                                content: sentContent,
                                messageType: handlerResult.interactivePayload ? "interactive" : "text",
                                timestamp: new Date()
                            });
                        }
                        if (handlerResult.textMessages?.length) {
                            for (const msgText of handlerResult.textMessages) {
                                await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                            }
                        } else if (sentContent && !handlerResult.interactivePayload) {
                            await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                        }
                        if (handlerResult.interactivePayload) {
                            await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                        }
                        return;
                    }
                } catch (actionErr) {
                    logger.error({ err: actionErr instanceof Error ? actionErr.message : actionErr, wizardAction }, "Wizard step action execution failed; falling back to AI response");
                }
            }
        }

        if (classification.intent === "SYSTEM_COMMAND") {
            let actionType: TypedAction["type"] = "HOME";
            if (classification.systemActionType === "BACK") actionType = "BACK";
            if (classification.systemActionType === "HELP") actionType = "HELP";
            if (classification.systemActionType === "MY_TRIP") actionType = "MY_TRIP";
            if (classification.systemActionType === "TRIP_CANCEL_PROMPT") actionType = "TRIP_CANCEL_PROMPT";

            const handlerResult: any = await WhatsAppActionHandler.handleAction({
                action: { type: actionType } as any,
                userId,
                conversationId,
                phoneNumber,
                activeLanguage: (activeLanguage || "en") as any
            });
            if (handlerResult) {
                if (handlerResult.menuContextToSet) {
                    await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                }
                const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                if (sentContent) {
                    await MessageRepository.create({
                        conversationId,
                        role: "assistant",
                        content: sentContent,
                        messageType: handlerResult.interactivePayload ? "interactive" : "text",
                        timestamp: new Date()
                    });
                }
                const interactiveBody = handlerResult.interactivePayload?.interactive?.body?.text?.trim();
                const outgoingTextMessages = (handlerResult.textMessages || []).filter((m: string) => !interactiveBody || m.trim() !== interactiveBody);
                if (outgoingTextMessages.length) {
                    for (const msgText of outgoingTextMessages) {
                        await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                    }
                } else if (sentContent && !handlerResult.interactivePayload) {
                    await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                }
                if (handlerResult.interactivePayload) {
                    await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                }
                return;
            }
        } else if (classification.intent === "TRIP_PLANNING") {
            let action: TypedAction = { type: "PLAN_TRIP" };
            if (classification.extractedCity) {
                action = { type: "SET_DESTINATION", destination: classification.extractedCity };
            }
            const handlerResult: any = await WhatsAppActionHandler.handleAction({
                action,
                userId,
                conversationId,
                phoneNumber,
                activeLanguage: (activeLanguage || "en") as any
            });
            if (handlerResult) {
                if (handlerResult.menuContextToSet) {
                    await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                }
                const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                if (sentContent) {
                    await MessageRepository.create({
                        conversationId,
                        role: "assistant",
                        content: sentContent,
                        messageType: handlerResult.interactivePayload ? "interactive" : "text",
                        timestamp: new Date()
                    });
                }
                if (handlerResult.textMessages?.length) {
                    for (const msgText of handlerResult.textMessages) {
                        await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                    }
                } else if (sentContent && !handlerResult.interactivePayload) {
                    await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                }
                if (handlerResult.interactivePayload) {
                    await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                }
                return;
            }
        } else if (
            classification.intent === "NAMED_LOCATION_SEARCH" ||
            ((classification.intent === "PLACES_ATTRACTIONS" ||
              classification.intent === "RESTAURANTS_FOOD" ||
              classification.intent === "HOTELS_STAYS") &&
             classification.extractedCity)
        ) {
            if (activeMenuContext && activeMenuContext.menuType && activeMenuContext.menuType.startsWith("wizard_")) {
                await ConversationRepository.pauseActiveMenuContext(conversationId);
            }

            const namedResult = await NamedLocationService.handleNamedLocationQuery({
                locationPhrase: classification.extractedCity || userMessage,
                category: (classification as any).category || "attractions",
                language: (activeLanguage || "en") as any,
                activeTripDestination: activeTrip?.destination
            });

            let replyText = namedResult.formattedMessage;
            if ((activeMenuContext && activeMenuContext.menuType && activeMenuContext.menuType.startsWith("wizard_")) || conversation?.pausedMenuContext) {
                const hint = activeLanguage === "mr"
                    ? "\n\n💡 *तुमच्या सहलीचे नियोजन पुन्हा सुरू करण्यासाठी कोणत्याही वेळी \"Continue planning\" टाइप करा.*"
                    : activeLanguage === "hi"
                        ? "\n\n💡 *अपनी ट्रिप योजना फिर से शुरू करने के लिए किसी भी समय \"Continue planning\" टाइप करें।*"
                        : "\n\n💡 *Type \"Continue planning\" anytime to resume your trip setup.*";
                replyText += hint;
            }

            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: replyText,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, replyText);
            return;
        } else if (classification.intent === "WEATHER") {
            if (activeMenuContext && activeMenuContext.menuType && activeMenuContext.menuType.startsWith("wizard_")) {
                await ConversationRepository.pauseActiveMenuContext(conversationId);
            }

            const handlerResult: any = await WhatsAppActionHandler.handleAction({
                action: { type: "WEATHER", destination: classification.extractedCity },
                userId,
                conversationId,
                phoneNumber,
                activeLanguage: (activeLanguage || "en") as any
            });
            if (handlerResult) {
                if (handlerResult.menuContextToSet) {
                    await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                }
                const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                if (sentContent) {
                    await MessageRepository.create({
                        conversationId,
                        role: "assistant",
                        content: sentContent,
                        messageType: handlerResult.interactivePayload ? "interactive" : "text",
                        timestamp: new Date()
                    });
                }
                if (handlerResult.textMessages?.length) {
                    for (const msgText of handlerResult.textMessages) {
                        await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                    }
                } else if (sentContent && !handlerResult.interactivePayload) {
                    await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                }
                if (handlerResult.interactivePayload) {
                    await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                }
                return;
            }
        } else if (
            classification.intent === "GPS_LOCATION_SEARCH" ||
            classification.intent === "PLACES_ATTRACTIONS" ||
            classification.intent === "RESTAURANTS_FOOD" ||
            classification.intent === "HOTELS_STAYS"
        ) {
            const handlerResult: any = await WhatsAppActionHandler.handleAction({
                action: { type: "LOC_CAT", category: (classification as any).category || "attractions" } as any,
                userId,
                conversationId,
                phoneNumber,
                activeLanguage: (activeLanguage || "en") as any
            });
            if (handlerResult) {
                if (handlerResult.menuContextToSet) {
                    await ConversationRepository.updateActiveMenuContext(conversationId, handlerResult.menuContextToSet);
                }
                const sentContent = handlerResult.fallbackText || (handlerResult.textMessages ? handlerResult.textMessages.join("\n\n") : "");
                if (sentContent) {
                    await MessageRepository.create({
                        conversationId,
                        role: "assistant",
                        content: sentContent,
                        messageType: handlerResult.interactivePayload ? "interactive" : "text",
                        timestamp: new Date()
                    });
                }
                if (handlerResult.textMessages?.length) {
                    for (const msgText of handlerResult.textMessages) {
                        await WhatsAppService.sendTextMessage(phoneNumber, msgText);
                    }
                } else if (sentContent && !handlerResult.interactivePayload) {
                    await WhatsAppService.sendTextMessage(phoneNumber, sentContent);
                }
                if (handlerResult.interactivePayload) {
                    await WhatsAppService.sendInteractiveMessage(phoneNumber, handlerResult.interactivePayload);
                }
                return;
            }
        } else if (classification.intent === "TRAVEL_ROUTE_GUIDANCE" || classification.intent === "NAVIGATION_DIRECTIONS") {
            if (activeMenuContext && activeMenuContext.menuType && activeMenuContext.menuType.startsWith("wizard_")) {
                await ConversationRepository.pauseActiveMenuContext(conversationId);
            }

            let routeText = await TripMitraChatbotService.handleChatbotQuery({
                userMessage: targetMsg,
                conversationId,
                userId,
                activeLanguage: (activeLanguage || "en") as any
            });

            if (conversation?.pausedMenuContext) {
                const hint = activeLanguage === "mr"
                    ? "\n\n💡 *तुमच्या सहलीचे नियोजन पुन्हा सुरू करण्यासाठी कोणत्याही वेळी \"Continue planning\" टाइप करा.*"
                    : activeLanguage === "hi"
                        ? "\n\n💡 *अपनी ट्रिप योजना फिर से शुरू करने के लिए किसी भी समय \"Continue planning\" टाइप करें।*"
                        : "\n\n💡 *Type \"Continue planning\" anytime to resume your trip setup.*";
                routeText += hint;
            }

            await MessageRepository.create({
                conversationId,
                role: "assistant",
                content: routeText,
                messageType: "text",
                timestamp: new Date()
            });
            await WhatsAppService.sendTextMessage(phoneNumber, routeText);
            return;
        }

        const recentMessages = await MessageRepository.findByConversationId(conversationId, 10);
        const history = recentMessages
            .reverse()
            .filter((m) => m.content !== targetMsg)
            .map((m) => ({
                role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
                content: m.content
            }));

        try {
            responseText = await TripMitraChatbotService.handleChatbotQuery({
                userMessage: targetMsg,
                conversationId,
                userId,
                activeLanguage: (activeLanguage || "en") as any,
                history
            });
        } catch (err) {
            logger.error({ err: err instanceof Error ? err.message : err }, "Failed to generate AI chatbot response; sending fallback");
            responseText = FALLBACK_AI_ERROR_MESSAGE;
        }

        await MessageRepository.create({
            conversationId,
            role: "assistant",
            content: responseText,
            messageType: "text",
            timestamp: new Date()
        });
        await WhatsAppService.sendTextMessage(phoneNumber, responseText);
    }

    static async processAiResponseAsync(params: ProcessAiJobParams) {
        await this.processAiJob(params);
    }
}
