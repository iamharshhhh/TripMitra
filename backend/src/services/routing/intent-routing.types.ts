import { SupportedLanguage } from "../language/language-detector.service.js";
import { IActiveMenuContext } from "../../models/Conversation.js";
import { ITripDocument } from "../../models/Trip.js";
export type ConversationalIntent = 
    | "SYSTEM_COMMAND" 
    | "RESUME_WIZARD" 
    | "WIZARD_STEP_ANSWER" 
    | "NAVIGATION_DIRECTIONS" 
    | "TRAVEL_ROUTE_GUIDANCE" 
    | "WEATHER" 
    | "NAMED_LOCATION_SEARCH" 
    | "GPS_LOCATION_SEARCH" 
    | "PLACES_ATTRACTIONS" 
    | "RESTAURANTS_FOOD" 
    | "HOTELS_STAYS" 
    | "TRIP_PLANNING" 
    | "TRIP_MODIFICATION" 
    | "GENERAL_TRAVEL_CHAT" 
    | "AMBIGUOUS_DATE_CLARIFICATION";

export interface IntentAnalysisParams {
    userMessage: string;
    activeLanguage?: SupportedLanguage;
    activeMenuContext?: IActiveMenuContext;
    pausedMenuContext?: IActiveMenuContext;
    activeTrip?: ITripDocument | null;
}

export interface IntentAnalysisResult {
    intent: ConversationalIntent;
    confidence: number;
    extractedCity?: string;
    category?: "attractions" | "food" | "hotels" | "cafes" | "shopping";
    isTopicSwitch: boolean;
    systemActionType?: "HOME" | "BACK" | "HELP" | "MY_TRIP" | "PLAN_TRIP" | "TRIP_CANCEL_PROMPT";
}
