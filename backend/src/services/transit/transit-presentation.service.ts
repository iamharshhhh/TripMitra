
import { TransitRoutePlan } from "./transit-routing.service.js";

const TRANSIT_LOCALIZED_STRINGS = {
    en: {
        header: (origin, dest) => `🧭 *Travel Routes: ${origin} → ${dest}*`,
        trainTitle: "🚆 *TRAIN OPTIONS*",
        busTitle: "🚌 *BUS OPTIONS*",
        flightTitle: "✈️ *FLIGHT OPTIONS*",
        roadTitle: "🚗 *ROAD / DRIVE / TAXI*",
        routeLabel: "Route",
        durationLabel: "Approx. Duration",
        distanceLabel: "Approx. Distance",
        hubLabel: "Hubs / Stations",
        interchangeLabel: "Transfer Points",
        guidanceLabel: "Guidance",
        checkTrainLink: "🔎 Check live trains & bookings (IRCTC):",
        checkBusLink: "🔎 Check bus schedules & seats:",
        checkFlightLink: "🔎 Search flights (Google Flights):",
        checkRoadLink: "🗺️ Google Maps Navigation:",
        disclaimer: "⚠️ _Note: Schedules, durations, and routes are general estimates. Please check live availability and bookings via official links._"
    },
    hi: {
        header: (origin, dest) => `🧭 *यात्रा मार्ग: ${origin} → ${dest}*`,
        trainTitle: "🚆 *ट्रेन विकल्प*",
        busTitle: "🚌 *बस विकल्प*",
        flightTitle: "✈️ *फ्लाइट विकल्प*",
        roadTitle: "🚗 *सड़क मार्ग / कार / टैक्सी*",
        routeLabel: "मार्ग",
        durationLabel: "अनुमानित समय",
        distanceLabel: "अनुमानित दूरी",
        hubLabel: "स्टेशन / हब",
        interchangeLabel: "कनेक्टिंग स्टेशन",
        guidanceLabel: "सलाह",
        checkTrainLink: "🔎 लाइव ट्रेन और बुकिंग देखें (IRCTC):",
        checkBusLink: "🔎 बस समय और सीट उपलब्धता देखें:",
        checkFlightLink: "🔎 फ्लाइट्स खोजें (Google Flights):",
        checkRoadLink: "🗺️ गूगल मैप्स नेविगेशन:",
        disclaimer: "⚠️ _सूचना: समय और मार्ग सामान्य मार्गदर्शन के लिए अनुमानित हैं। वास्तविक उपलब्धता और बुकिंग के लिए आधिकारिक लिंक देखें।_"
    },
    mr: {
        header: (origin, dest) => `🧭 *प्रवास मार्ग: ${origin} → ${dest}*`,
        trainTitle: "🚆 *ट्रेन पर्याय*",
        busTitle: "🚌 *बस पर्याय*",
        flightTitle: "✈️ *विमान पर्याय*",
        roadTitle: "🚗 *रस्ता प्रवास / कार / टॅक्सी*",
        routeLabel: "मार्ग",
        durationLabel: "अंदाजे वेळ",
        distanceLabel: "अंदाजे अंतर",
        hubLabel: "स्टेशन्स / हब",
        interchangeLabel: "बदलायचे जंक्शन",
        guidanceLabel: "माहिती",
        checkTrainLink: "🔎 लाईव्ह ट्रेन आणि बुकिंग तपासा (IRCTC):",
        checkBusLink: "🔎 बस वेळापत्रक आणि सीट्स तपासा:",
        checkFlightLink: "🔎 विमाने शोधा (Google Flights):",
        checkRoadLink: "🗺️ गुगल मॅप्स नेव्हिगेशन:",
        disclaimer: "⚠️ _टीप: वेळ आणि प्रवास मार्ग मार्गदर्शनासाठी अंदाजित आहेत. प्रत्यक्ष उपलब्धता आणि बुकिंगसाठी अधिकृत लिंक तपासा._"
    }
};
export class TransitPresentationService {
    /**
     * Formats a single modal route option into structured text.
     */
    static formatRouteOption(opt: any, labels: any) {
        const lines = [];
        switch (opt.mode) {
            case "train":
                lines.push(labels.trainTitle);
                lines.push("━━━━━━━━━━━━━━━━━━━━");
                lines.push(`• *${labels.routeLabel}:* ${opt.summary}`);
                lines.push(`• *${labels.durationLabel}:* ${opt.approximateDuration}`);
                if (opt.departureHub && opt.arrivalHub) {
                    lines.push(`• *${labels.hubLabel}:* ${opt.departureHub} ➔ ${opt.arrivalHub}`);
                }
                if (opt.interchangePoints && opt.interchangePoints.length > 0) {
                    lines.push(`• *${labels.interchangeLabel}:* ${opt.interchangePoints.join(", ")}`);
                }
                lines.push(`• ${opt.guidance}`);
                lines.push(`\n${labels.checkTrainLink}\n${opt.bookingSearchUrl}`);
                break;
            case "bus":
                lines.push(labels.busTitle);
                lines.push("━━━━━━━━━━━━━━━━━━━━");
                lines.push(`• *${labels.routeLabel}:* ${opt.summary}`);
                lines.push(`• *${labels.durationLabel}:* ${opt.approximateDuration}`);
                if (opt.departureHub && opt.arrivalHub) {
                    lines.push(`• *${labels.hubLabel}:* ${opt.departureHub} ➔ ${opt.arrivalHub}`);
                }
                lines.push(`• ${opt.guidance}`);
                lines.push(`\n${labels.checkBusLink}\n${opt.bookingSearchUrl}`);
                break;
            case "flight":
                lines.push(labels.flightTitle);
                lines.push("━━━━━━━━━━━━━━━━━━━━");
                lines.push(`• *${labels.routeLabel}:* ${opt.summary}`);
                lines.push(`• *${labels.durationLabel}:* ${opt.approximateDuration}`);
                if (opt.departureHub && opt.arrivalHub) {
                    lines.push(`• *${labels.hubLabel}:* ${opt.departureHub} ➔ ${opt.arrivalHub}`);
                }
                lines.push(`• ${opt.guidance}`);
                lines.push(`\n${labels.checkFlightLink}\n${opt.bookingSearchUrl}`);
                break;
            case "road":
                lines.push(labels.roadTitle);
                lines.push("━━━━━━━━━━━━━━━━━━━━");
                if (opt.approximateDistanceKm) {
                    lines.push(`• *${labels.distanceLabel}:* ~${opt.approximateDistanceKm} km`);
                }
                lines.push(`• *${labels.durationLabel}:* ${opt.approximateDuration}`);
                lines.push(`• ${opt.guidance}`);
                lines.push(`\n${labels.checkRoadLink}\n${opt.bookingSearchUrl}`);
                break;
        }
        return lines.join("\n");
    }
    /**
     * Formats a full TransitRoutePlan into WhatsApp-ready presentation text.
     */
    static formatRoutePlan(plan: TransitRoutePlan, language = "en") {
        const labels = TRANSIT_LOCALIZED_STRINGS[language] || TRANSIT_LOCALIZED_STRINGS.en;
        const chunks = [];
        // Header
        chunks.push(labels.header(plan.origin, plan.destination));
        // Formatted Options
        for (const option of plan.routeOptions) {
            chunks.push(this.formatRouteOption(option, labels));
        }
        // Disclaimer
        chunks.push(labels.disclaimer);
        return chunks.join("\n\n");
    }
}
