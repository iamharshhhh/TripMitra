import { MULTILINGUAL_UI_STRINGS } from "../../whatsapp-ui.strings.js";
import { WhatsAppActionId } from "../../whatsapp-ui.types.js";
import { WhatsAppMessageBuilder } from "../../whatsapp-message.builder.js";
import { botUIConfig } from "../../whatsapp-ui.config.js";
import { WeatherFormatter } from "../../formatters/weather.formatter.js";
import { TripSummaryFormatter } from "../../formatters/trip-summary.formatter.js";
import { TripLifecycleService } from "../../../trip/trip-lifecycle.service.js";
import { ITripDocument } from "../../../../models/Trip.js";
import { DailyForecast } from "../../../../tools/weather.tool.js";

export class MenuScreensPresenter {
    /**
     * Builds the comprehensive 6-item WhatsApp Main Menu list message.
     */
    static sendMainMenu(to: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const headerTitle = "TripMitra";
        const bodyText = strings.menuHeaders.welcome;
        const sections = [
            {
                title: strings.wizardUI.mainMenuSections.travelAndTrips,
                rows: [
                    {
                        id: WhatsAppActionId.MENU_PLAN_TRIP,
                        title: strings.listTitles.menuPlanTitle,
                        description: strings.listTitles.menuPlanDesc
                    },
                    {
                        id: WhatsAppActionId.MENU_MY_TRIP,
                        title: strings.listTitles.menuTripTitle,
                        description: strings.listTitles.menuTripDesc
                    },
                    {
                        id: WhatsAppActionId.MENU_WEATHER,
                        title: strings.listTitles.menuWeatherTitle,
                        description: strings.listTitles.menuWeatherDesc
                    }
                ]
            },
            {
                title: strings.wizardUI.mainMenuSections.toolsAndSettings,
                rows: [
                    {
                        id: WhatsAppActionId.MENU_LANGUAGE,
                        title: strings.listTitles.menuLangTitle,
                        description: strings.listTitles.menuLangDesc
                    },
                    {
                        id: WhatsAppActionId.MENU_LOCATION,
                        title: strings.listTitles.menuLocTitle,
                        description: strings.listTitles.menuLocDesc
                    },
                    {
                        id: WhatsAppActionId.MENU_HELP,
                        title: strings.listTitles.menuHelpTitle,
                        description: strings.listTitles.menuHelpDesc
                    }
                ]
            }
        ];
        const allRows = sections.flatMap((s) => s.rows);
        const fallbackOptions = allRows.map((r, i) => ({
            key: String(i + 1),
            label: r.title,
            rawActionId: r.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildListMessage({
                    to,
                    headerText: headerTitle,
                    bodyText,
                    buttonText: strings.menuHeaders.optionsButton,
                    sections
                });
            }
            catch (err) {
                console.error("sendMainMenu buildListMessage error:", err);
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "main_menu",
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Builds the Active Trip Summary Card with interactive actions.
     */
    static sendActiveTripMenu(to: string, trip: any, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        if (!trip) {
            const emptyText = lang === "mr"
                ? "तुमची कोणतीही सक्रिय सहल नाही. चला एक नवीन सहल सुरू करूया!"
                : lang === "hi"
                    ? "आपकी कोई सक्रिय ट्रिप नहीं है। चलिए एक नई यात्रा शुरू करते हैं!"
                    : "You don't have an active trip yet. Let's plan one!";
            const buttons = [
                { id: WhatsAppActionId.MENU_PLAN_TRIP, title: strings.buttonLabels[WhatsAppActionId.MENU_PLAN_TRIP] },
                { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] }
            ];
            const fallbackOptions = buttons.map((b, i) => ({
                key: String(i + 1),
                label: b.title,
                rawActionId: b.id
            }));
            const fallbackText = `${emptyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
                .map((o) => `${o.key}. ${o.label}`)
                .join("\n")}`;
            let interactivePayload;
            if (botUIConfig.enabled) {
                try {
                    interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                        to,
                        bodyText: emptyText,
                        buttons
                    });
                }
                catch {
                    interactivePayload = undefined;
                }
            }
            return {
                textMessages: [],
                interactivePayload,
                fallbackText,
                menuContextToSet: {
                    menuType: "active_trip",
                    validOptions: fallbackOptions,
                    ttlSeconds: botUIConfig.menuTTLSeconds
                }
            };
        }
        const snapshot = (trip.itinerarySnapshot || trip.itinerary);
        const hasCompletedItinerary = (trip.planningState === "completed" || trip.status === "confirmed") &&
            Boolean(snapshot?.days && snapshot.days.length > 0);
        const lifecycle = TripLifecycleService.calculateLifecycle(trip);
        const summaryCard = TripSummaryFormatter.formatActiveTripCard(trip, hasCompletedItinerary, lang);
        const isCancellable = TripLifecycleService.isCancellableTrip(trip);
        const tripIdStr = trip._id ? trip._id.toString() : "";
        let buttons;
        if (isCancellable) {
            if (hasCompletedItinerary) {
                buttons = [
                    { id: WhatsAppActionId.TRIP_VIEW_ITINERARY, title: strings.buttonLabels[WhatsAppActionId.TRIP_VIEW_ITINERARY] || (lang === "mr" ? "📖 वेळापत्रक पहा" : lang === "hi" ? "📖 यात्रा विवरण देखें" : "📖 View Itinerary") },
                    { id: tripIdStr ? `${WhatsAppActionId.TRIP_CANCEL_PROMPT}:${tripIdStr}` : WhatsAppActionId.TRIP_CANCEL_PROMPT, title: strings.buttonLabels[WhatsAppActionId.TRIP_CANCEL_PROMPT] || (lang === "mr" ? "❌ सहल रद्द करा" : lang === "hi" ? "❌ ट्रिप रद्द करें" : "❌ Cancel Trip") },
                    { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] || (lang === "mr" ? "🏠 मुख्य मेनू" : lang === "hi" ? "🏠 मुख्य मेनू" : "🏠 Main Menu") }
                ];
            }
            else {
                // PLANNING state
                buttons = [
                    { id: tripIdStr ? `${WhatsAppActionId.TRIP_CONTINUE}:${tripIdStr}` : WhatsAppActionId.TRIP_CONTINUE, title: strings.buttonLabels[WhatsAppActionId.TRIP_CONTINUE] || (lang === "mr" ? "▶ नियोजन पुढे चालू ठेवा" : lang === "hi" ? "▶ योजना जारी रखें" : "▶ Continue Planning") },
                    { id: tripIdStr ? `${WhatsAppActionId.TRIP_CANCEL_PROMPT}:${tripIdStr}` : WhatsAppActionId.TRIP_CANCEL_PROMPT, title: strings.buttonLabels[WhatsAppActionId.TRIP_CANCEL_PROMPT] || (lang === "mr" ? "❌ सहल रद्द करा" : lang === "hi" ? "❌ ट्रिप रद्द करें" : "❌ Cancel Trip") },
                    { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] || (lang === "mr" ? "🏠 मुख्य मेनू" : lang === "hi" ? "🏠 मुख्य मेनू" : "🏠 Main Menu") }
                ];
            }
        }
        else {
            // COMPLETED or CANCELLED state
            buttons = [
                { id: WhatsAppActionId.MENU_PLAN_TRIP, title: strings.buttonLabels[WhatsAppActionId.MENU_PLAN_TRIP] || (lang === "mr" ? "✈️ सहल आखा" : lang === "hi" ? "✈️ नई ट्रिप प्लान करें" : "✈️ Plan a Trip") },
                { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] || (lang === "mr" ? "🏠 मुख्य मेनू" : lang === "hi" ? "🏠 मुख्य मेनू" : "🏠 Main Menu") }
            ];
        }
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${summaryCard}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText: summaryCard,
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "active_trip",
                tripId: tripIdStr || undefined,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Two-step Confirmation Menu for Trip Cancellation.
     */
    static sendTripCancelConfirmMenu(to: string, tripId: string, lang = "en", options: {
        isUpcoming?: boolean;
        destination?: string;
    }) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const isUpcoming = Boolean(options?.isUpcoming);
        const destination = options?.destination || "";
        const title = isUpcoming
            ? strings.menuHeaders.tripCancelPromptUpcomingTitle
            : strings.menuHeaders.tripCancelPromptTitle;
        const body = isUpcoming
            ? strings.menuHeaders.tripCancelPromptUpcomingBody(destination)
            : strings.menuHeaders.tripCancelPromptBody;
        const bodyText = `${title}\n\n${body}`;
        const buttons = [
            { id: `${WhatsAppActionId.TRIP_CANCEL_CONFIRM}:${tripId}`, title: strings.buttonLabels[WhatsAppActionId.TRIP_CANCEL_CONFIRM] },
            { id: `${WhatsAppActionId.TRIP_CANCEL_ABORT}:${tripId}`, title: strings.buttonLabels[WhatsAppActionId.TRIP_CANCEL_ABORT] }
        ];
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText,
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "trip_cancel_confirm",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Displays the 3-option Language Picker with Reply Buttons.
     */
    static sendLanguageMenu(to: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const bodyText = strings.menuHeaders.languagePrompt;
        const buttons = [
            { id: WhatsAppActionId.LANG_EN, title: "🇬🇧 English" },
            { id: WhatsAppActionId.LANG_MR, title: "🇮🇳 मराठी" },
            { id: WhatsAppActionId.LANG_HI, title: "🇮🇳 हिन्दी" }
        ];
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText,
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "language_picker",
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Displays Help & capabilities guide.
     */
    static sendHelpMenu(to: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const bodyText = strings.menuHeaders.helpText;
        const buttons = [
            { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] }
        ];
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText,
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "help_menu",
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Displays Location prompt or received options.
     */
    static sendLocationMenu(to: string, lang = "en", hasLocationPin = false) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        if (!hasLocationPin) {
            const bodyText = strings.menuHeaders.locationPromptNoPin;
            const buttons = [
                { id: WhatsAppActionId.MENU_PLAN_TRIP, title: strings.buttonLabels[WhatsAppActionId.MENU_PLAN_TRIP] },
                { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] }
            ];
            const fallbackOptions = buttons.map((b, i) => ({
                key: String(i + 1),
                label: b.title,
                rawActionId: b.id
            }));
            const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
                .map((o) => `${o.key}. ${o.label}`)
                .join("\n")}`;
            let interactivePayload;
            if (botUIConfig.enabled) {
                try {
                    interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                        to,
                        bodyText,
                        buttons
                    });
                }
                catch {
                    interactivePayload = undefined;
                }
            }
            return {
                textMessages: [],
                interactivePayload,
                fallbackText,
                menuContextToSet: {
                    menuType: "location_menu",
                    validOptions: fallbackOptions,
                    ttlSeconds: botUIConfig.menuTTLSeconds
                }
            };
        }
        return MenuScreensPresenter.sendLocationDiscoveryMenu(to, lang);
    }
    /**
     * Direct Location Discovery Menu with 5 selectable options:
     * Attractions, Restaurants, Hotels, Weather, Main Menu.
     */
    static sendLocationDiscoveryMenu(to: string, lang = "en", headerOrIntro?: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const bodyText = headerOrIntro || strings.menuHeaders.locationDiscoveryPrompt;
        const sections = [
            {
                title: strings.wizardUI.mainMenuSections.toolsAndSettings || "Discovery",
                rows: [
                    {
                        id: WhatsAppActionId.LOC_CAT_ATTRACTIONS,
                        title: strings.listTitles.discoveryAttractionsTitle,
                        description: strings.listTitles.discoveryAttractionsDesc
                    },
                    {
                        id: WhatsAppActionId.LOC_CAT_FOOD,
                        title: strings.listTitles.discoveryFoodTitle,
                        description: strings.listTitles.discoveryFoodDesc
                    },
                    {
                        id: WhatsAppActionId.LOC_CAT_HOTELS,
                        title: strings.listTitles.discoveryHotelsTitle,
                        description: strings.listTitles.discoveryHotelsDesc
                    },
                    {
                        id: WhatsAppActionId.WEATHER,
                        title: strings.listTitles.discoveryWeatherTitle,
                        description: strings.listTitles.discoveryWeatherDesc
                    },
                    {
                        id: WhatsAppActionId.HOME,
                        title: strings.listTitles.discoveryHomeTitle,
                        description: strings.listTitles.discoveryHomeDesc
                    }
                ]
            }
        ];
        const allRows = sections.flatMap((s) => s.rows);
        const fallbackOptions = allRows.map((r, i) => ({
            key: String(i + 1),
            label: r.title,
            rawActionId: r.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildListMessage({
                    to,
                    bodyText,
                    buttonText: strings.menuHeaders.optionsButton,
                    sections
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "location_discovery",
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Dedicated Live Weather Card with multi-day forecasts and interactive controls.
     */
    static sendWeatherCard(to: string, destination: string, forecasts: DailyForecast[], tripId: string, lang = "en", dateRangeStr: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const header = strings.menuHeaders.weatherCardHeader(destination);
        const forecastLines = WeatherFormatter.formatForecastLines(forecasts, lang, dateRangeStr);
        const cardBody = `${header}\n\n${forecastLines.join("\n\n")}`;
        const buttons = [
            { id: `${WhatsAppActionId.WEATHER_REFRESH}:${destination}`, title: "🔄 Refresh" },
            { id: WhatsAppActionId.HOME, title: strings.buttonLabels[WhatsAppActionId.HOME] }
        ];
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${cardBody}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText: cardBody.slice(0, 1024),
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: interactivePayload ? [] : [cardBody],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "weather_card",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Category Selector for Explore Nearby Places (Delegates directly to Discovery Menu)
     */
    static sendLocationCategoryMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendLocationDiscoveryMenu(to, lang);
    }
    /**
     * Generates the Itinerary Modification List Menu.
     */
    static buildModificationMenu(to: string, tripId: string, version: number, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const bodyText = `${strings.menuHeaders.modifyTitle}\n${strings.menuHeaders.modifyPrompt}`;
        const rows = [
            {
                id: `${WhatsAppActionId.MAKE_CHEAPER}:${tripId}:${version}`,
                title: strings.listTitles.modCheaperTitle,
                description: strings.listTitles.modCheaperDesc
            },
            {
                id: `${WhatsAppActionId.LESS_WALKING}:${tripId}:${version}`,
                title: strings.listTitles.modLessWalkTitle,
                description: strings.listTitles.modLessWalkDesc
            },
            {
                id: `${WhatsAppActionId.MORE_HISTORY}:${tripId}:${version}`,
                title: strings.listTitles.modHistoryTitle,
                description: strings.listTitles.modHistoryDesc
            },
            {
                id: `${WhatsAppActionId.MORE_FOOD}:${tripId}:${version}`,
                title: strings.listTitles.modFoodTitle,
                description: strings.listTitles.modFoodDesc
            },
            {
                id: `${WhatsAppActionId.REDUCE_PACE}:${tripId}:${version}`,
                title: strings.listTitles.modPaceTitle,
                description: strings.listTitles.modPaceDesc
            },
            {
                id: `${WhatsAppActionId.VIEW_TRIP}:${tripId}`,
                title: strings.listTitles.modBackTitle,
                description: strings.listTitles.modBackDesc
            }
        ];
        const fallbackOptions = rows.map((r, i) => ({
            key: String(i + 1),
            label: r.title,
            rawActionId: r.id
        }));
        const fallbackText = `${bodyText}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildListMessage({
                    to,
                    bodyText,
                    buttonText: strings.buttonLabels[WhatsAppActionId.MODIFY_MENU],
                    sections: [
                        {
                            title: strings.menuHeaders.modifyTitle.slice(0, 24),
                            rows
                        }
                    ]
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        return {
            textMessages: [],
            interactivePayload,
            fallbackText,
            menuContextToSet: {
                menuType: "modification_options",
                tripId,
                expectedVersion: version,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }

    /**
     * Generates direct discovery menu after a location pin is shared.
     */
    static buildLocationActionMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendLocationDiscoveryMenu(to, lang);
    }
}
