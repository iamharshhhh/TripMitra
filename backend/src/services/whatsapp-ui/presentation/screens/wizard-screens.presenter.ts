import { MULTILINGUAL_UI_STRINGS, INTEREST_CATEGORY_DEFINITIONS, HUMAN_FRIENDLY_INTEREST_LABELS, formatLocalizedDuration, formatLocalizedTravelers } from "../../whatsapp-ui.strings.js";
import { WhatsAppActionId } from "../../whatsapp-ui.types.js";
import { WhatsAppMessageBuilder } from "../../whatsapp-message.builder.js";
import { botUIConfig } from "../../whatsapp-ui.config.js";
import { formatDisplayDate } from "../../../../utils/date-parser.js";
import { TripSummaryFormatter } from "../../formatters/trip-summary.formatter.js";

export class WizardScreensPresenter {
    /**
     * Wizard Step 1: Destination Input Prompt.
     */
    static sendDestinationMenu(to: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const bodyText = strings.menuHeaders.planTripPrompt;
        return {
            textMessages: [bodyText],
            fallbackText: bodyText,
            menuContextToSet: {
                menuType: "wizard_destination",
                validOptions: [],
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Prompts user for destination when starting trip planning.
     */
    static sendPlanTripPrompt(to: string, lang = "en") {
        return this.sendDestinationMenu(to, lang);
    }
    /**
     * Wizard Step 2: Travel Date Selection (Quick options + Custom Date prompt)
     */
    static sendTravelDateMenu(to: string, destination = "your destination", tripId: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.travelDate;
        const bodyText = wiz.header(destination);
        const rows = [
            { id: `${WhatsAppActionId.SET_TRAVEL_DATE}:today`, title: wiz.rows.today.title, description: wiz.rows.today.desc },
            { id: `${WhatsAppActionId.SET_TRAVEL_DATE}:tomorrow`, title: wiz.rows.tomorrow.title, description: wiz.rows.tomorrow.desc },
            { id: `${WhatsAppActionId.SET_TRAVEL_DATE}:this_weekend`, title: wiz.rows.thisWeekend.title, description: wiz.rows.thisWeekend.desc },
            { id: `${WhatsAppActionId.SET_TRAVEL_DATE}:next_weekend`, title: wiz.rows.nextWeekend.title, description: wiz.rows.nextWeekend.desc },
            { id: WhatsAppActionId.CUSTOM_DATE, title: wiz.rows.customDate.title, description: wiz.rows.customDate.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:1`, title: wiz.rows.back.title, description: wiz.rows.back.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_travel_date",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 2.5: Custom Date Prompt
     */
    static sendCustomDatePrompt(to: string, destination = "your destination", tripId: string, lang = "en") {
        const bodyText = lang === "mr"
            ? `📅 आपण *${destination}* येथे कधी जाणार आहात?\n\nकृपया प्रवासाची तारीख टाईप करा.\n\nउदा:\n• 15 Oct 2026\n• Tomorrow\n• This Weekend\n• 15/10/2026`
            : lang === "hi"
                ? `📅 आप *${destination}* कब जाने की योजना बना रहे हैं?\n\nकृपया यात्रा की तारीख दर्ज करें।\n\nउदाहरण:\n• 15 Oct 2026\n• Tomorrow\n• This Weekend\n• 15/10/2026`
                : `📅 *When are you traveling to ${destination}?*\n\nPlease enter your travel date below.\n\nExamples:\n• 15 Oct 2026\n• Tomorrow\n• This Weekend\n• 15/10/2026`;
        return {
            textMessages: [bodyText],
            fallbackText: bodyText,
            menuContextToSet: {
                menuType: "wizard_custom_date",
                tripId,
                validOptions: [],
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 3: Duration Selector (1-7 Days + Custom Days)
     */
    static sendDurationMenu(to: string, destination = "your destination", tripId: string, lang = "en", startDateIso: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.duration;
        const dateLine = startDateIso ? `\n📅 ${formatDisplayDate(startDateIso)}` : "";
        const bodyText = wiz.header(destination, dateLine);
        const rows = [
            { id: `${WhatsAppActionId.SET_DURATION}:1`, title: wiz.rows.day1.title, description: wiz.rows.day1.desc },
            { id: `${WhatsAppActionId.SET_DURATION}:2`, title: wiz.rows.day2.title, description: wiz.rows.day2.desc },
            { id: `${WhatsAppActionId.SET_DURATION}:3`, title: wiz.rows.day3.title, description: wiz.rows.day3.desc },
            { id: `${WhatsAppActionId.SET_DURATION}:4`, title: wiz.rows.day4.title, description: wiz.rows.day4.desc },
            { id: `${WhatsAppActionId.SET_DURATION}:5`, title: wiz.rows.day5.title, description: wiz.rows.day5.desc },
            { id: `${WhatsAppActionId.SET_DURATION}:7`, title: wiz.rows.day7.title, description: wiz.rows.day7.desc },
            { id: WhatsAppActionId.CUSTOM_DAYS, title: wiz.rows.custom.title, description: wiz.rows.custom.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:2`, title: wiz.rows.back.title, description: wiz.rows.back.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_duration",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 3.5: Custom Days Prompt (1-30)
     */
    static sendCustomDaysPrompt(to: string, _destination = "your destination", tripId: string, lang = "en") {
        const bodyText = lang === "mr"
            ? "🗓️ किती दिवस?\n\nकृपया 1 ते 30 दरम्यान संख्या टाका."
            : lang === "hi"
                ? "🗓️ कितने दिन?\n\nकृपया 1 से 30 के बीच संख्या दर्ज करें।"
                : "🗓️ *How many days will your trip be?*\n\nEnter a number between 1 and 30 (e.g. 4, 7).";
        return {
            textMessages: [bodyText],
            fallbackText: bodyText,
            menuContextToSet: {
                menuType: "wizard_custom_days",
                tripId,
                validOptions: [],
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 4: Traveler Selector (Solo, Couple, Family, Group 5-8, Custom)
     */
    static sendTravelerMenu(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en", startDateIso: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.travelers;
        const dateLine = startDateIso ? `\n📅 ${formatDisplayDate(startDateIso)}` : "";
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const bodyText = wiz.header(destination, dateLine, durationStr);
        const rows = [
            { id: `${WhatsAppActionId.SET_TRAVELERS}:1`, title: wiz.rows.solo.title, description: wiz.rows.solo.desc },
            { id: `${WhatsAppActionId.SET_TRAVELERS}:2`, title: wiz.rows.couple.title, description: wiz.rows.couple.desc },
            { id: `${WhatsAppActionId.SET_TRAVELERS}:4`, title: wiz.rows.family.title, description: wiz.rows.family.desc },
            { id: WhatsAppActionId.GROUP_SIZE_PICKER, title: wiz.rows.group.title, description: wiz.rows.group.desc },
            { id: WhatsAppActionId.CUSTOM_TRAVELERS, title: wiz.rows.custom.title, description: wiz.rows.custom.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:3`, title: wiz.rows.back.title, description: wiz.rows.back.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_travelers",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 4.2: Group Size Picker (5, 6, 7, 8)
     */
    static sendGroupSizePicker(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.groupSize;
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const bodyText = wiz.header(destination, durationStr);
        const rows = [
            { id: `${WhatsAppActionId.SET_TRAVELERS}:5`, title: wiz.peopleLabel(5).title, description: wiz.peopleLabel(5).desc },
            { id: `${WhatsAppActionId.SET_TRAVELERS}:6`, title: wiz.peopleLabel(6).title, description: wiz.peopleLabel(6).desc },
            { id: `${WhatsAppActionId.SET_TRAVELERS}:7`, title: wiz.peopleLabel(7).title, description: wiz.peopleLabel(7).desc },
            { id: `${WhatsAppActionId.SET_TRAVELERS}:8`, title: wiz.peopleLabel(8).title, description: wiz.peopleLabel(8).desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:4`, title: wiz.back.title, description: wiz.back.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_group_size",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 4.5: Custom Group Size Prompt (1-50)
     */
    static sendCustomTravelersPrompt(to: string, _destination = "your destination", _durationDays = 3, tripId: string, lang = "en") {
        const bodyText = lang === "mr"
            ? "👥 किती प्रवासी आहेत?\n\nकृपया 1 ते 50 दरम्यान संख्या टाका."
            : lang === "hi"
                ? "👥 कितने यात्री हैं?\n\nकृपया 1 से 50 के बीच संख्या दर्ज करें।"
                : "👥 *How many travelers in your group?*\n\nEnter a number between 1 and 50.";
        return {
            textMessages: [bodyText],
            fallbackText: bodyText,
            menuContextToSet: {
                menuType: "wizard_custom_travelers",
                tripId,
                validOptions: [],
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 5: Budget Selector (Budget, Moderate, Luxury, Enter Budget Amount)
     */
    static sendBudgetMenu(to: string, destination = "your destination", durationDays = 3, travelers = 1, tripId: string, lang = "en", startDateIso: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.budget;
        const dateLine = startDateIso ? `\n📅 ${formatDisplayDate(startDateIso)}` : "";
        const count = typeof travelers === "number" ? travelers : parseInt(String(travelers), 10) || 1;
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const travelerStr = formatLocalizedTravelers(count, lang);
        const bodyText = wiz.header(destination, dateLine, durationStr, travelerStr);
        const rows = [
            { id: `${WhatsAppActionId.SET_BUDGET}:budget`, title: wiz.rows.budget.title, description: wiz.rows.budget.desc },
            { id: `${WhatsAppActionId.SET_BUDGET}:moderate`, title: wiz.rows.moderate.title, description: wiz.rows.moderate.desc },
            { id: `${WhatsAppActionId.SET_BUDGET}:luxury`, title: wiz.rows.luxury.title, description: wiz.rows.luxury.desc },
            { id: WhatsAppActionId.CUSTOM_BUDGET, title: wiz.rows.enterAmount.title, description: wiz.rows.enterAmount.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:4`, title: wiz.rows.back.title, description: wiz.rows.back.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_budget",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 5.5: Custom Budget Amount Prompt
     */
    static sendCustomBudgetPrompt(to: string, _destination = "your destination", _durationDays = 3, tripId: string, lang = "en") {
        const bodyText = lang === "mr"
            ? "💵 आपले एकूण सहल बजेट किती आहे?\n\nकृपया रक्कम टाका (उदा. ₹25,000 किंवा 25000)."
            : lang === "hi"
                ? "💵 आपका कुल ट्रिप बजट कितना है?\n\nकृपया राशि दर्ज करें (उदा. ₹25,000 या 25000)।"
                : "💰 *What's your total trip budget?*\n\nEnter an amount in INR (e.g. ₹25,000 or 25000).";
        return {
            textMessages: [bodyText],
            fallbackText: bodyText,
            menuContextToSet: {
                menuType: "wizard_custom_budget",
                tripId,
                validOptions: [],
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 6: Interests Selector (Multi-selection via list toggle)
     */
    static sendInterestMenu(to: string, destination = "your destination", durationDays = 3, budgetCategory = "moderate", selectedInterests = [], tripId: string, lang = "en", startDateIso: string) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.interests;
        const selectedLabels = selectedInterests.map((id) => HUMAN_FRIENDLY_INTEREST_LABELS[id] || (id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " ")));
        const dateLine = startDateIso ? `\n📅 ${formatDisplayDate(startDateIso)}` : "";
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const budgetCategoryStr = strings.wizardUI.budget.categories[budgetCategory] ||
            budgetCategory;
        let bodyText = wiz.header(destination, dateLine, durationStr, budgetCategoryStr);
        if (selectedLabels.length > 0) {
            bodyText += `\n\n${wiz.selectedLabel(selectedLabels.length)}\n${selectedLabels.join(" · ")}`;
        }
        const primaryCategories = INTEREST_CATEGORY_DEFINITIONS.slice(0, 8);
        const categoryRows = primaryCategories.map((def) => {
            const isSelected = selectedInterests.includes(def.id);
            const labelObj = def.labels[lang] || def.labels.en;
            const checkIcon = isSelected ? "☑️ " : "◻️ ";
            return {
                id: `${WhatsAppActionId.TOGGLE_INTEREST}:${def.id}`,
                title: `${checkIcon}${labelObj.title}`.slice(0, 24),
                description: labelObj.desc
            };
        });
        const doneRow = {
            id: WhatsAppActionId.INTERESTS_DONE,
            title: wiz.doneTitle.slice(0, 24),
            description: wiz.doneDesc(selectedInterests.length)
        };
        const backRow = {
            id: `${WhatsAppActionId.EDIT_STEP}:5`,
            title: wiz.back.title,
            description: wiz.back.desc
        };
        const rows = [...categoryRows, doneRow, backRow];
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_interests",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 7: Pacing / Travel Style Selector (Relaxed, Balanced, Fast-Paced)
     */
    static sendPacingMenu(to: string, destination = "your destination", durationDays = 3, preferredPace = "balanced", tripId: string, lang = "en", tripContext: {
        startDate?: string;
        travelers?: number | string;
        budget?: any;
        interests?: string[];
        budgetStr?: string;
        interestsStr?: string;
    }) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.pacing;
        let budgetStr = tripContext?.budgetStr;
        if (!budgetStr && tripContext?.budget) {
            const b = tripContext.budget;
            if (typeof b === "object" && typeof b.maxTotalAmount === "number" && b.maxTotalAmount > 0) {
                budgetStr = `₹${b.maxTotalAmount.toLocaleString("en-IN")}`;
            }
            else if (typeof b === "object" && b.category) {
                const catKey = b.category;
                budgetStr = strings.wizardUI.budget.categories[catKey] || (b.category.charAt(0).toUpperCase() + b.category.slice(1));
            }
            else if (typeof b === "string") {
                const catKey = b;
                budgetStr = strings.wizardUI.budget.categories[catKey] || (b.charAt(0).toUpperCase() + b.slice(1));
            }
        }
        let interestsStr = tripContext?.interestsStr;
        if (!interestsStr && tripContext?.interests && tripContext.interests.length > 0) {
            interestsStr = tripContext.interests
                .map((id) => HUMAN_FRIENDLY_INTEREST_LABELS[id] || (id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " ")))
                .join(" · ");
        }
        else if (!interestsStr) {
            interestsStr = strings.wizardUI.summary.famousPlacesDefault;
        }
        const dateLine = tripContext?.startDate ? `\n📅 ${formatDisplayDate(tripContext.startDate)}` : "";
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const lines = [wiz.header(destination, dateLine, durationStr)];
        if (tripContext?.travelers) {
            const count = typeof tripContext.travelers === "number" ? tripContext.travelers : parseInt(String(tripContext.travelers), 10) || 1;
            lines.push(`👥 ${formatLocalizedTravelers(count, lang)}`);
        }
        if (budgetStr)
            lines.push(`💰 ${budgetStr}`);
        if (interestsStr)
            lines.push(`🎯 ${interestsStr}`);
        const bodyText = `${lines.join("\n")}\n\n${wiz.choosePacePrompt}`;
        const buttons = [
            { id: `${WhatsAppActionId.SET_PACING}:relaxed`, title: wiz.buttons.relaxed },
            { id: `${WhatsAppActionId.SET_PACING}:balanced`, title: wiz.buttons.balanced },
            { id: `${WhatsAppActionId.SET_PACING}:fast_paced`, title: wiz.buttons.fastPaced }
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
                menuType: "wizard_pacing",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Step 8: Confirmation & Generation Card
     */
    static sendTripConfirmationCard(to: string, trip: any, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const card = TripSummaryFormatter.formatConfirmationSummary(trip, lang);
        const tripId = trip._id ? trip._id.toString() : (trip.tripId ? String(trip.tripId) : undefined);
        const buttons = [
            { id: WhatsAppActionId.TRIP_CONFIRM, title: lang === "mr" ? "✨ वेळापत्रक बनवा" : lang === "hi" ? "✨ यात्रा बनाएं" : "✨ Generate Trip" },
            { id: WhatsAppActionId.TRIP_EDIT_MENU, title: lang === "mr" ? "✏️ बदल करा" : lang === "hi" ? "✏️ बदलाव करें" : "✏️ Edit Details" },
            { id: WhatsAppActionId.TRIP_CANCEL, title: lang === "mr" ? "❌ रद्द करा" : lang === "hi" ? "❌ रद्द करें" : "❌ Cancel" }
        ];
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const fallbackText = `${card}\n\n${strings.menuHeaders.fallbackIntro}\n${fallbackOptions
            .map((o) => `${o.key}. ${o.label}`)
            .join("\n")}`;
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText: card,
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
                menuType: "wizard_confirmation",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Wizard Edit Menu allowing users to jump directly to any field to modify.
     */
    static sendTripEditMenu(to: string, tripId: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.editMenu;
        const bodyText = wiz.header;
        const rows = [
            { id: `${WhatsAppActionId.EDIT_STEP}:1`, title: wiz.rows.destination.title, description: wiz.rows.destination.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:2`, title: wiz.rows.travelDate.title, description: wiz.rows.travelDate.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:3`, title: wiz.rows.duration.title, description: wiz.rows.duration.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:4`, title: wiz.rows.travelers.title, description: wiz.rows.travelers.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:5`, title: wiz.rows.budget.title, description: wiz.rows.budget.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:6`, title: wiz.rows.interests.title, description: wiz.rows.interests.desc },
            { id: `${WhatsAppActionId.EDIT_STEP}:summary`, title: wiz.rows.backToSummary.title, description: wiz.rows.backToSummary.desc }
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
                    buttonText: wiz.buttonText,
                    sections: [
                        {
                            title: wiz.sectionTitle,
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
                menuType: "wizard_edit",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Generation Error / Retry Menu
     */
    static sendGenerationErrorMenu(to: string, tripId: string, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const wiz = strings.wizardUI.generationError;
        const bodyText = strings.menuHeaders.generateErrorRetry ||
            "⚠️ We couldn't create your itinerary yet.\n\nYour trip details are saved.";
        const buttons = [
            { id: WhatsAppActionId.TRIP_RETRY_GENERATE, title: wiz.retryButton },
            { id: WhatsAppActionId.TRIP_EDIT_MENU, title: wiz.editButton },
            { id: WhatsAppActionId.HOME, title: wiz.homeButton }
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
                menuType: "wizard_confirmation",
                tripId,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
}
