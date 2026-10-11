import { SupportedLanguage } from "../language/language-detector.service.js";

export type TypedAction = {
    type: "HOME";
} | {
    type: "HELP";
} | {
    type: "BACK";
} | {
    type: "NAV_MAIN_MENU";
} | {
    type: "NAV_BACK";
} | {
    type: "NAV_CANCEL";
} | {
    type: "RESUME_WIZARD";
} | {
    type: "PLAN_TRIP";
} | {
    type: "MY_TRIP";
} | {
    type: "VIEW_TRIP";
    tripId?: string;
} | {
    type: "VIEW_DAY";
    tripId?: string;
    dayNumber: number;
} | {
    type: "FULL_ITINERARY";
    tripId: string;
} | {
    type: "TRIP_CONTINUE";
    tripId?: string;
} | {
    type: "TRIP_NEW";
} | {
    type: "TRIP_CHANGE_DESTINATION";
} | {
    type: "SET_DESTINATION";
    destination: string;
} | {
    type: "TRAVEL_DATE";
} | {
    type: "SET_TRAVEL_DATE";
    date: string;
} | {
    type: "CUSTOM_DATE";
} | {
    type: "SET_DURATION";
    durationDays: number;
} | {
    type: "CUSTOM_DAYS";
} | {
    type: "SET_TRAVELERS";
    count: number | string;
} | {
    type: "GROUP_SIZE_PICKER";
} | {
    type: "CUSTOM_TRAVELERS";
} | {
    type: "SET_BUDGET";
    category: string;
    amount?: number;
} | {
    type: "CUSTOM_BUDGET";
} | {
    type: "SET_INTERESTS";
    interests: string[];
} | {
    type: "TOGGLE_INTEREST";
    category: string;
} | {
    type: "INTERESTS_DONE";
} | {
    type: "INTERESTS_BACK";
} | {
    type: "SET_PACING";
    pacing: string;
} | {
    type: "TRIP_CONFIRM";
} | {
    type: "TRIP_RETRY_GENERATE";
} | {
    type: "TRIP_EDIT_MENU";
} | {
    type: "EDIT_STEP";
    step: number | string;
} | {
    type: "TRIP_CANCEL";
} | {
    type: "TRIP_CANCEL_PROMPT";
    tripId?: string;
} | {
    type: "TRIP_CANCEL_CONFIRM";
    tripId?: string;
} | {
    type: "TRIP_CANCEL_ABORT";
    tripId?: string;
} | {
    type: "DAY_NEXT";
    dayNumber: number;
} | {
    type: "DAY_PREV";
    dayNumber: number;
} | {
    type: "NEARBY_PLACES";
} | {
    type: "LOCATION_MENU";
} | {
    type: "LOCATION_NEXT_STOP";
} | {
    type: "LOC_CAT";
    category: "food" | "attractions" | "hotels" | "cafes" | "shopping" | "photos";
} | {
    type: "WEATHER";
    destination?: string;
} | {
    type: "WEATHER_REFRESH";
    destination?: string;
} | {
    type: "DIRECTIONS";
    tripId?: string;
    placeIndex?: number;
} | {
    type: "MODIFY_MENU";
    tripId: string;
    expectedVersion: number;
} | {
    type: "MAKE_CHEAPER";
    tripId: string;
    expectedVersion: number;
} | {
    type: "LESS_WALKING";
    tripId: string;
    expectedVersion: number;
} | {
    type: "MORE_HISTORY";
    tripId: string;
    expectedVersion: number;
} | {
    type: "MORE_FOOD";
    tripId: string;
    expectedVersion: number;
} | {
    type: "REDUCE_PACE";
    tripId: string;
    expectedVersion: number;
} | {
    type: "LANGUAGE_MENU";
} | {
    type: "SET_LANGUAGE";
    language: SupportedLanguage;
};

export interface WhatsAppReplyButton {
    type: "reply";
    reply: {
        id: string;
        title: string;
    };
}

export interface WhatsAppListRow {
    id: string;
    title: string;
    description?: string;
}

export interface WhatsAppListSection {
    title?: string;
    rows: WhatsAppListRow[];
}

export interface WhatsAppInteractiveButtonPayload {
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
    type: "interactive";
    interactive: {
        type: "button";
        header?: {
            type: "text";
            text: string;
        };
        body: {
            text: string;
        };
        footer?: {
            text: string;
        };
        action: {
            buttons: WhatsAppReplyButton[];
        };
    };
}

export interface WhatsAppInteractiveListPayload {
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
    type: "interactive";
    interactive: {
        type: "list";
        header?: {
            type: "text";
            text: string;
        };
        body: {
            text: string;
        };
        footer?: {
            text: string;
        };
        action: {
            button: string;
            sections: WhatsAppListSection[];
        };
    };
}

export type WhatsAppInteractivePayload = WhatsAppInteractiveButtonPayload | WhatsAppInteractiveListPayload;

export interface WhatsAppUIResponse {
    textMessages: string[];
    interactivePayload?: WhatsAppInteractivePayload;
    fallbackText: string;
    menuContextToSet?: {
        menuType: "itinerary_days" | "modification_options" | "language_picker" | "main_menu" | "active_trip" | "location_menu" | "help_menu" | "requirement_duration" | "requirement_travelers" | "requirement_budget" | "requirement_interests" | "requirement_pacing" | "trip_confirmation" | "trip_edit" | "trip_cancel_confirm" | "location_discovery" | "wizard_destination" | "wizard_travel_date" | "wizard_custom_date" | "wizard_duration" | "wizard_custom_days" | "wizard_travelers" | "wizard_group_size" | "wizard_custom_travelers" | "wizard_budget" | "wizard_custom_budget" | "wizard_interests" | "wizard_pacing" | "wizard_confirmation" | "wizard_edit" | "trip_cancel_confirm" | "location_discovery" | "weather_card";
        tripId?: string;
        expectedVersion?: number;
        validOptions: Array<{
            key: string;
            label: string;
            rawActionId: string;
        }>;
        ttlSeconds?: number;
    };
}

export enum WhatsAppActionId {
    HOME = "ACT_HOME",
    HELP = "ACT_HELP",
    BACK = "ACT_BACK",
    NAV_MAIN_MENU = "NAV_MAIN_MENU",
    NAV_BACK = "NAV_BACK",
    NAV_CANCEL = "NAV_CANCEL",
    RESUME_WIZARD = "ACT_RESUME_WIZARD",
    MENU_PLAN_TRIP = "MENU_PLAN_TRIP",
    MENU_MY_TRIP = "MENU_MY_TRIP",
    MENU_WEATHER = "MENU_WEATHER",
    MENU_LANGUAGE = "MENU_LANGUAGE",
    MENU_LOCATION = "MENU_LOCATION",
    MENU_HELP = "MENU_HELP",
    PLAN_TRIP = "ACT_PLAN_TRIP",
    VIEW_TRIP = "ACT_VIEW_TRIP",
    VIEW_DAY = "ACT_VIEW_DAY",
    FULL_ITINERARY = "ACT_FULL_ITIN",
    TRIP_CONTINUE = "TRIP_CONTINUE",
    TRIP_NEW = "TRIP_NEW",
    TRIP_CHANGE_DESTINATION = "TRIP_CHANGE_DESTINATION",
    TRIP_VIEW_ITINERARY = "TRIP_VIEW_ITINERARY",
    SET_DESTINATION = "SET_DESTINATION",
    TRAVEL_DATE = "ACT_TRAVEL_DATE",
    SET_TRAVEL_DATE = "SET_TRAVEL_DATE",
    CUSTOM_DATE = "CUSTOM_DATE",
    SET_DURATION = "SET_DURATION",
    CUSTOM_DAYS = "CUSTOM_DAYS",
    SET_TRAVELERS = "SET_TRAVELERS",
    GROUP_SIZE_PICKER = "GROUP_SIZE_PICKER",
    CUSTOM_TRAVELERS = "CUSTOM_TRAVELERS",
    SET_BUDGET = "SET_BUDGET",
    CUSTOM_BUDGET = "CUSTOM_BUDGET",
    SET_INTERESTS = "SET_INTERESTS",
    TOGGLE_INTEREST = "TOGGLE_INTEREST",
    INTERESTS_DONE = "INTERESTS_DONE",
    INTERESTS_BACK = "INTERESTS_BACK",
    SET_PACING = "SET_PACING",
    TRIP_CONFIRM = "TRIP_CONFIRM",
    TRIP_RETRY_GENERATE = "TRIP_RETRY_GENERATE",
    TRIP_EDIT_MENU = "TRIP_EDIT_MENU",
    EDIT_STEP = "EDIT_STEP",
    TRIP_CANCEL = "TRIP_CANCEL",
    DAY_NEXT = "DAY_NEXT",
    DAY_PREV = "DAY_PREV",
    TRIP_CANCEL_PROMPT = "TRIP_CANCEL_PROMPT",
    TRIP_CANCEL_CONFIRM = "TRIP_CANCEL_CONFIRM",
    TRIP_CANCEL_ABORT = "TRIP_CANCEL_ABORT",
    NEARBY_PLACES = "ACT_NEARBY_PLACES",
    WEATHER = "ACT_WEATHER",
    WEATHER_REFRESH = "WEATHER_REFRESH",
    DIRECTIONS = "ACT_DIRECTIONS",
    LOCATION_NEARBY = "LOCATION_NEARBY",
    LOCATION_NEXT_STOP = "LOCATION_NEXT_STOP",
    LOCATION_NAVIGATION = "LOCATION_NAVIGATION",
    LOC_CAT_FOOD = "LOC_CAT_FOOD",
    LOC_CAT_ATTRACTIONS = "LOC_CAT_ATTRACTIONS",
    LOC_CAT_HOTELS = "LOC_CAT_HOTELS",
    LOC_CAT_CAFES = "LOC_CAT_CAFES",
    LOC_CAT_SHOPPING = "LOC_CAT_SHOPPING",
    LOC_CAT_PHOTOS = "LOC_CAT_PHOTOS",
    MODIFY_MENU = "ACT_MOD_MENU",
    MAKE_CHEAPER = "ACT_MOD_CHEAPER",
    LESS_WALKING = "ACT_MOD_LESS_WALK",
    MORE_HISTORY = "ACT_MOD_HISTORY",
    MORE_FOOD = "ACT_MOD_FOOD",
    REDUCE_PACE = "ACT_MOD_PACE",
    LANGUAGE_MENU = "ACT_LANG_MENU",
    SET_LANGUAGE = "ACT_SET_LANG",
    LANG_EN = "LANG_EN",
    LANG_HI = "LANG_HI",
    LANG_MR = "LANG_MR"
}

/**
 * Verified Meta WhatsApp Cloud API v21.0 Constraints
 */
export const META_WHATSAPP_CONSTRAINTS = {
    MAX_REPLY_BUTTONS: 3,
    MAX_BUTTON_TITLE_LENGTH: 20,
    MAX_REPLY_BUTTON_ID_LENGTH: 256,
    MAX_LIST_ROWS: 10,
    MAX_LIST_BUTTON_TITLE_LENGTH: 20,
    MAX_LIST_SECTION_TITLE_LENGTH: 24,
    MAX_LIST_ROW_TITLE_LENGTH: 24,
    MAX_LIST_ROW_DESCRIPTION_LENGTH: 72,
    MAX_LIST_ROW_ID_LENGTH: 200,
    MAX_INTERACTIVE_BODY_LENGTH: 1024,
    MAX_HEADER_TEXT_LENGTH: 60,
    MAX_FOOTER_TEXT_LENGTH: 60,
    // Application-level defensive ID length
    MAX_ACTION_ID_LENGTH: 64
};
/**
 * Canonical Action IDs
 */
/**
 * Central Meta WhatsApp Interactive Payload Validator
 */
export function validateWhatsAppInteractivePayload(payload: WhatsAppInteractivePayload) {
    const errors = [];
    if (!payload || typeof payload !== "object") {
        return { valid: false, errors: ["Payload is null or not an object"] };
    }
    const interactive = payload.interactive;
    if (!interactive) {
        return { valid: false, errors: ["Missing interactive field"] };
    }
    if (interactive.body && interactive.body.text.length > META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH) {
        errors.push(`Body text length (${interactive.body.text.length}) exceeds maximum limit (${META_WHATSAPP_CONSTRAINTS.MAX_INTERACTIVE_BODY_LENGTH})`);
    }
    if (interactive.type === "button") {
        const buttons = interactive.action?.buttons || [];
        if (buttons.length > META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS) {
            errors.push(`Reply button count (${buttons.length}) exceeds maximum limit (${META_WHATSAPP_CONSTRAINTS.MAX_REPLY_BUTTONS})`);
        }
        for (const b of buttons) {
            if (b.reply?.title && b.reply.title.length > META_WHATSAPP_CONSTRAINTS.MAX_BUTTON_TITLE_LENGTH) {
                errors.push(`Button title "${b.reply.title}" (${b.reply.title.length} chars) exceeds max limit (${META_WHATSAPP_CONSTRAINTS.MAX_BUTTON_TITLE_LENGTH})`);
            }
        }
    }
    else if (interactive.type === "list") {
        const sections = interactive.action?.sections || [];
        const totalRows = sections.flatMap((s) => s.rows || []);
        if (totalRows.length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROWS) {
            errors.push(`List row count (${totalRows.length}) exceeds maximum limit (${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROWS})`);
        }
        for (const row of totalRows) {
            if (row.title && row.title.length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_TITLE_LENGTH) {
                errors.push(`List row title "${row.title}" (${row.title.length} chars) exceeds max limit (${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_TITLE_LENGTH})`);
            }
            if (row.description &&
                row.description.length > META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_DESCRIPTION_LENGTH) {
                errors.push(`List row description (${row.description.length} chars) exceeds max limit (${META_WHATSAPP_CONSTRAINTS.MAX_LIST_ROW_DESCRIPTION_LENGTH})`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
