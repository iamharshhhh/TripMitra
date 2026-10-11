import { MULTILINGUAL_UI_STRINGS } from "../../whatsapp-ui.strings.js";
import { WhatsAppActionId } from "../../whatsapp-ui.types.js";
import { WhatsAppMessageBuilder } from "../../whatsapp-message.builder.js";
import { botUIConfig } from "../../whatsapp-ui.config.js";
import { ItineraryFormatter } from "../../formatters/itinerary.formatter.js";
import { ITripDocument } from "../../../../models/Trip.js";
import { PersistedItinerarySnapshot } from "../../../itinerary/itinerary-persistence.types.js";

export class ItineraryScreensPresenter {
    /**
     * Presents a single-day itinerary with intuitive Day 1 / Next / Prev pagination controls.
     */
    static sendDayItinerary(to: string, trip: ITripDocument, snapshot: PersistedItinerarySnapshot, dayNumber = 1, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const tripId = trip._id.toString();
        const totalDays = snapshot?.days?.length || 1;
        const currentDay = Math.max(1, Math.min(dayNumber, totalDays));
        const dayData = snapshot?.days?.find((d) => d.dayNumber === currentDay) || snapshot?.days?.[0];
        const dayText = dayData
            ? ItineraryFormatter.formatWhatsAppDayCard(dayData, lang, trip.destination, totalDays)
            : `${strings.wizardUI.itineraryActivityPlaceholders.dayNumberHeader(currentDay)}\n\n${trip.destination}`;
        const homeTitle = lang === "mr" ? "मुख्य मेनू" : lang === "hi" ? "मुख्य मेनू" : "↩️ Main Menu";
        let buttons;
        if (totalDays === 1) {
            buttons = [
                { id: WhatsAppActionId.LOCATION_NEARBY, title: strings.buttonLabels[WhatsAppActionId.LOCATION_NEARBY] || "📍 Nearby" },
                { id: WhatsAppActionId.HOME, title: homeTitle }
            ];
        }
        else if (currentDay === 1) {
            buttons = [
                { id: `${WhatsAppActionId.DAY_NEXT}:${tripId}:2`, title: strings.wizardUI.itineraryPagination.nextDay(2) },
                { id: WhatsAppActionId.HOME, title: homeTitle }
            ];
        }
        else if (currentDay === totalDays) {
            buttons = [
                { id: `${WhatsAppActionId.DAY_PREV}:${tripId}:${currentDay - 1}`, title: strings.wizardUI.itineraryPagination.prevDay(currentDay - 1) },
                { id: WhatsAppActionId.HOME, title: homeTitle }
            ];
        }
        else {
            buttons = [
                { id: `${WhatsAppActionId.DAY_PREV}:${tripId}:${currentDay - 1}`, title: strings.wizardUI.itineraryPagination.prevDay(currentDay - 1) },
                { id: `${WhatsAppActionId.DAY_NEXT}:${tripId}:${currentDay + 1}`, title: lang === "mr" ? `दिवस ${currentDay + 1} ➡️` : lang === "hi" ? `दिन ${currentDay + 1} ➡️` : `Day ${currentDay + 1} ➡️` },
                { id: WhatsAppActionId.HOME, title: homeTitle }
            ];
        }
        const fallbackOptions = buttons.map((b, i) => ({
            key: String(i + 1),
            label: b.title,
            rawActionId: b.id
        }));
        const navPromptText = strings.wizardUI.itineraryPagination.navHeader(currentDay, totalDays);
        let textMessages = [dayText];
        let interactivePayload;
        if (botUIConfig.enabled) {
            try {
                interactivePayload = WhatsAppMessageBuilder.buildButtonMessage({
                    to,
                    bodyText: navPromptText,
                    buttons
                });
            }
            catch {
                interactivePayload = undefined;
            }
        }
        const fallbackNavText = `${navPromptText}\n\n` +
            fallbackOptions.map((opt) => `${opt.key}. ${opt.label}`).join("\n");
        const fullFallbackText = `${dayText}\n\n──────────────\n${fallbackNavText}`;
        if (!interactivePayload) {
            textMessages = [fullFallbackText];
        }
        return {
            textMessages,
            interactivePayload,
            fallbackText: fullFallbackText,
            menuContextToSet: {
                menuType: "itinerary_days",
                tripId,
                expectedVersion: snapshot?.itineraryVersion || 1,
                validOptions: fallbackOptions,
                ttlSeconds: botUIConfig.menuTTLSeconds
            }
        };
    }
    /**
     * Contextual actions attached to an itinerary snapshot.
     */
    static sendItineraryActions(to: string, trip: ITripDocument, snapshot: PersistedItinerarySnapshot, lang = "en") {
        return this.sendDayItinerary(to, trip, snapshot, 1, lang);
    }
}
