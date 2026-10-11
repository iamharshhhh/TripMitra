import { z } from "zod";
import { WhatsAppActionId, META_WHATSAPP_CONSTRAINTS } from "./whatsapp-ui.types.js";

export class ActionValidationError extends Error {
    rawActionId;
    constructor(message: string, rawActionId: string) {
        super(`ActionValidationError: ${message} (raw: "${rawActionId}")`);
        this.rawActionId = rawActionId;
        this.name = "ActionValidationError";
    }
}
const VersionParamSchema = z
    .string()
    .regex(/^v?([1-9]\d*)$/, "Expected version format 'v1' or '1'")
    .transform((val) => parseInt(val.replace(/^v/, ""), 10));
const DayParamSchema = z
    .string()
    .regex(/^([1-9]\d*)$/, "Expected positive integer day number")
    .transform((val) => parseInt(val, 10))
    .refine((day) => day >= 1 && day <= 30, "Day number must be between 1 and 30");
const PlaceIndexParamSchema = z
    .string()
    .regex(/^(\d+)$/, "Expected place index integer")
    .transform((val) => parseInt(val, 10))
    .refine((idx) => idx >= 0 && idx <= 50, "Place index must be between 0 and 50");
const LanguageParamSchema = z.enum(["en", "mr", "hi"]);
export class WhatsAppActionParser {
    /**
     * Parses a raw action ID string into a validated TypedAction object.
     * Throws ActionValidationError if malformed, unknown, or out of bounds.
     */
    static parse(rawId: string) {
        if (!rawId || typeof rawId !== "string") {
            throw new ActionValidationError("Action ID must be a non-empty string", String(rawId));
        }
        const trimmed = rawId.trim();
        if (trimmed.length > META_WHATSAPP_CONSTRAINTS.MAX_ACTION_ID_LENGTH) {
            throw new ActionValidationError(`Action ID exceeds maximum length of ${META_WHATSAPP_CONSTRAINTS.MAX_ACTION_ID_LENGTH} chars`, trimmed);
        }
        // Must be composed of valid characters: letters, numbers, underscores, colons, hyphens
        if (!/^[A-Z0-9_]+(:[a-zA-Z0-9_-]+)*$/.test(trimmed)) {
            throw new ActionValidationError("Action ID contains illegal characters or invalid format", trimmed);
        }
        const parts = trimmed.split(":");
        const actionName = parts[0];
        switch (actionName) {
            case WhatsAppActionId.HOME:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "HOME" };
            case WhatsAppActionId.RESUME_WIZARD:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "RESUME_WIZARD" };
            case WhatsAppActionId.HELP:
            case WhatsAppActionId.MENU_HELP:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "HELP" };
            case WhatsAppActionId.BACK:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "BACK" };
            case WhatsAppActionId.PLAN_TRIP:
            case WhatsAppActionId.MENU_PLAN_TRIP:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "PLAN_TRIP" };
            case WhatsAppActionId.MENU_MY_TRIP:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "MY_TRIP" };
            case WhatsAppActionId.VIEW_TRIP:
                // Optional tripId
                if (parts.length > 2) {
                    throw new ActionValidationError("VIEW_TRIP expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "VIEW_TRIP", tripId: parts[1] };
            case WhatsAppActionId.TRIP_CONTINUE:
                if (parts.length > 2) {
                    throw new ActionValidationError("TRIP_CONTINUE expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "TRIP_CONTINUE", tripId: parts[1] };
            case WhatsAppActionId.TRIP_NEW:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_NEW" };
            case WhatsAppActionId.TRIP_CHANGE_DESTINATION:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_CHANGE_DESTINATION" };
            case WhatsAppActionId.TRIP_VIEW_ITINERARY:
                if (parts.length > 2) {
                    throw new ActionValidationError("TRIP_VIEW_ITINERARY expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "FULL_ITINERARY", tripId: parts[1] || "" };
            case WhatsAppActionId.VIEW_DAY: {
                // Expected: ACT_VIEW_DAY:tripId:dayNumber
                this.assertParamCount(parts, 3, trimmed);
                const tripId = parts[1];
                const dayParse = DayParamSchema.safeParse(parts[2]);
                if (!dayParse.success) {
                    throw new ActionValidationError(`Invalid day number: ${parts[2]}`, trimmed);
                }
                return { type: "VIEW_DAY", tripId, dayNumber: dayParse.data };
            }
            case WhatsAppActionId.FULL_ITINERARY: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "FULL_ITINERARY", tripId: parts[1] };
            }
            case WhatsAppActionId.NEARBY_PLACES:
            case WhatsAppActionId.LOCATION_NEARBY:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "NEARBY_PLACES" };
            case WhatsAppActionId.MENU_LOCATION:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOCATION_MENU" };
            case WhatsAppActionId.LOCATION_NEXT_STOP:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOCATION_NEXT_STOP" };
            case WhatsAppActionId.WEATHER:
            case WhatsAppActionId.MENU_WEATHER:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "WEATHER" };
            case WhatsAppActionId.DIRECTIONS:
            case WhatsAppActionId.LOCATION_NAVIGATION: {
                if (parts.length === 1) {
                    return { type: "NEARBY_PLACES" };
                }
                this.assertParamCount(parts, 3, trimmed);
                const tripId = parts[1];
                const idxParse = PlaceIndexParamSchema.safeParse(parts[2]);
                if (!idxParse.success) {
                    throw new ActionValidationError(`Invalid place index: ${parts[2]}`, trimmed);
                }
                return { type: "DIRECTIONS", tripId, placeIndex: idxParse.data };
            }
            case WhatsAppActionId.MODIFY_MENU: {
                this.assertParamCount(parts, 3, trimmed);
                const tripId = parts[1];
                const verParse = VersionParamSchema.safeParse(parts[2]);
                if (!verParse.success) {
                    throw new ActionValidationError(`Invalid expected version: ${parts[2]}`, trimmed);
                }
                return { type: "MODIFY_MENU", tripId, expectedVersion: verParse.data };
            }
            case WhatsAppActionId.MAKE_CHEAPER:
            case WhatsAppActionId.LESS_WALKING:
            case WhatsAppActionId.MORE_HISTORY:
            case WhatsAppActionId.MORE_FOOD:
            case WhatsAppActionId.REDUCE_PACE: {
                this.assertParamCount(parts, 3, trimmed);
                const tripId = parts[1];
                const verParse = VersionParamSchema.safeParse(parts[2]);
                if (!verParse.success) {
                    throw new ActionValidationError(`Invalid expected version: ${parts[2]}`, trimmed);
                }
                const expectedVersion = verParse.data;
                if (actionName === WhatsAppActionId.MAKE_CHEAPER) {
                    return { type: "MAKE_CHEAPER", tripId, expectedVersion };
                }
                if (actionName === WhatsAppActionId.LESS_WALKING) {
                    return { type: "LESS_WALKING", tripId, expectedVersion };
                }
                if (actionName === WhatsAppActionId.MORE_HISTORY) {
                    return { type: "MORE_HISTORY", tripId, expectedVersion };
                }
                if (actionName === WhatsAppActionId.MORE_FOOD) {
                    return { type: "MORE_FOOD", tripId, expectedVersion };
                }
                return { type: "REDUCE_PACE", tripId, expectedVersion };
            }
            case WhatsAppActionId.LANGUAGE_MENU:
            case WhatsAppActionId.MENU_LANGUAGE:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LANGUAGE_MENU" };
            case WhatsAppActionId.SET_LANGUAGE: {
                this.assertParamCount(parts, 2, trimmed);
                const langParse = LanguageParamSchema.safeParse(parts[1]);
                if (!langParse.success) {
                    throw new ActionValidationError(`Invalid language code: ${parts[1]}`, trimmed);
                }
                return { type: "SET_LANGUAGE", language: langParse.data };
            }
            case WhatsAppActionId.LANG_EN:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "SET_LANGUAGE", language: "en" };
            case WhatsAppActionId.LANG_HI:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "SET_LANGUAGE", language: "hi" };
            case WhatsAppActionId.LANG_MR:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "SET_LANGUAGE", language: "mr" };
            case WhatsAppActionId.NAV_MAIN_MENU:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "HOME" };
            case WhatsAppActionId.NAV_BACK:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "BACK" };
            case WhatsAppActionId.NAV_CANCEL:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "HOME" };
            case WhatsAppActionId.SET_DESTINATION: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "SET_DESTINATION", destination: parts[1] };
            }
            case WhatsAppActionId.TRAVEL_DATE:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRAVEL_DATE" };
            case WhatsAppActionId.SET_TRAVEL_DATE: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "SET_TRAVEL_DATE", date: parts[1] };
            }
            case WhatsAppActionId.CUSTOM_DATE:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "CUSTOM_DATE" };
            case WhatsAppActionId.EDIT_STEP: {
                this.assertParamCount(parts, 2, trimmed);
                const validSteps = [
                    "1", "2", "3", "4", "5", "6", "7", "8",
                    "destination", "travel_date", "date", "duration", "travelers", "budget", "interests", "pacing", "summary"
                ];
                if (!validSteps.includes(parts[1].toLowerCase())) {
                    throw new ActionValidationError(`Invalid edit step: ${parts[1]}`, trimmed);
                }
                return { type: "EDIT_STEP", step: parts[1] };
            }
            case WhatsAppActionId.SET_DURATION: {
                this.assertParamCount(parts, 2, trimmed);
                const dayParse = DayParamSchema.safeParse(parts[1]);
                if (!dayParse.success) {
                    throw new ActionValidationError(`Invalid duration: ${parts[1]}`, trimmed);
                }
                return { type: "SET_DURATION", durationDays: dayParse.data };
            }
            case WhatsAppActionId.CUSTOM_DAYS: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "CUSTOM_DAYS" };
            }
            case WhatsAppActionId.SET_TRAVELERS: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "SET_TRAVELERS", count: parts[1] };
            }
            case WhatsAppActionId.GROUP_SIZE_PICKER: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "GROUP_SIZE_PICKER" };
            }
            case WhatsAppActionId.CUSTOM_TRAVELERS: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "CUSTOM_TRAVELERS" };
            }
            case WhatsAppActionId.SET_BUDGET: {
                if (parts.length === 3) {
                    const amount = parseInt(parts[2], 10);
                    return { type: "SET_BUDGET", category: parts[1], amount: isNaN(amount) ? undefined : amount };
                }
                this.assertParamCount(parts, 2, trimmed);
                return { type: "SET_BUDGET", category: parts[1] };
            }
            case WhatsAppActionId.CUSTOM_BUDGET: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "CUSTOM_BUDGET" };
            }
            case WhatsAppActionId.SET_INTERESTS: {
                this.assertParamCount(parts, 2, trimmed);
                const interests = parts[1].split(",").map((i) => i.trim()).filter(Boolean);
                return { type: "SET_INTERESTS", interests };
            }
            case WhatsAppActionId.TOGGLE_INTEREST: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "TOGGLE_INTEREST", category: parts[1].trim() };
            }
            case WhatsAppActionId.INTERESTS_DONE: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "INTERESTS_DONE" };
            }
            case WhatsAppActionId.INTERESTS_BACK: {
                this.assertParamCount(parts, 1, trimmed);
                return { type: "INTERESTS_BACK" };
            }
            case WhatsAppActionId.WEATHER_REFRESH: {
                if (parts.length > 2) {
                    throw new ActionValidationError("WEATHER_REFRESH expects at most 1 parameter (destination)", trimmed);
                }
                return { type: "WEATHER_REFRESH", destination: parts[1] };
            }
            case WhatsAppActionId.SET_PACING: {
                this.assertParamCount(parts, 2, trimmed);
                return { type: "SET_PACING", pacing: parts[1] };
            }
            case WhatsAppActionId.TRIP_CONFIRM:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_CONFIRM" };
            case WhatsAppActionId.TRIP_RETRY_GENERATE:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_RETRY_GENERATE" };
            case WhatsAppActionId.TRIP_EDIT_MENU:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_EDIT_MENU" };
            case WhatsAppActionId.TRIP_CANCEL:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "TRIP_CANCEL" };
            case WhatsAppActionId.TRIP_CANCEL_PROMPT:
                if (parts.length > 2) {
                    throw new ActionValidationError("TRIP_CANCEL_PROMPT expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "TRIP_CANCEL_PROMPT", tripId: parts[1] };
            case WhatsAppActionId.TRIP_CANCEL_CONFIRM:
                if (parts.length > 2) {
                    throw new ActionValidationError("TRIP_CANCEL_CONFIRM expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "TRIP_CANCEL_CONFIRM", tripId: parts[1] };
            case WhatsAppActionId.TRIP_CANCEL_ABORT:
                if (parts.length > 2) {
                    throw new ActionValidationError("TRIP_CANCEL_ABORT expects at most 1 parameter (tripId)", trimmed);
                }
                return { type: "TRIP_CANCEL_ABORT", tripId: parts[1] };
            case WhatsAppActionId.DAY_NEXT: {
                const hasTripId = parts.length === 3;
                const rawDay = hasTripId ? parts[2] : parts[1];
                const dayParse = DayParamSchema.safeParse(rawDay);
                if (!dayParse.success) {
                    throw new ActionValidationError(`Invalid day number: ${rawDay}`, trimmed);
                }
                return hasTripId
                    ? { type: "DAY_NEXT", tripId: parts[1], dayNumber: dayParse.data }
                    : { type: "DAY_NEXT", dayNumber: dayParse.data };
            }
            case WhatsAppActionId.DAY_PREV: {
                const hasTripId = parts.length === 3;
                const rawDay = hasTripId ? parts[2] : parts[1];
                const dayParse = DayParamSchema.safeParse(rawDay);
                if (!dayParse.success) {
                    throw new ActionValidationError(`Invalid day number: ${rawDay}`, trimmed);
                }
                return hasTripId
                    ? { type: "DAY_PREV", tripId: parts[1], dayNumber: dayParse.data }
                    : { type: "DAY_PREV", dayNumber: dayParse.data };
            }
            case WhatsAppActionId.LOC_CAT_FOOD:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "food" };
            case WhatsAppActionId.LOC_CAT_ATTRACTIONS:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "attractions" };
            case WhatsAppActionId.LOC_CAT_HOTELS:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "hotels" };
            case WhatsAppActionId.LOC_CAT_CAFES:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "cafes" };
            case WhatsAppActionId.LOC_CAT_SHOPPING:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "shopping" };
            case WhatsAppActionId.LOC_CAT_PHOTOS:
                this.assertParamCount(parts, 1, trimmed);
                return { type: "LOC_CAT", category: "photos" };
            default:
                throw new ActionValidationError(`Unknown action name: ${actionName}`, trimmed);
        }
    }
    /**
     * Safely tries to parse an action ID without throwing.
     * Returns null if parsing fails.
     */
    static safeParse(rawId: string) {
        try {
            return this.parse(rawId);
        }
        catch {
            return null;
        }
    }
    static assertParamCount(parts: any, expectedCount: any, rawId: any) {
        if (parts.length !== expectedCount) {
            throw new ActionValidationError(`Expected ${expectedCount - 1} parameters, but got ${parts.length - 1}`, rawId);
        }
    }
}
