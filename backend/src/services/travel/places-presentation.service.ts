import { NavigationUrlBuilder } from "../navigation/navigation-url.builder.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { NormalizedPlace } from "../../tools/places.tool.js";

export interface StructuredPlaceContextItem {
    index: number;
    placeId: string;
    name: string;
    address?: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    openNow?: boolean;
    latitude?: number;
    longitude?: number;
    distanceMeters?: number;
    distanceKm?: number;
    mapsUrl: string;
}

export type PlaceCategoryType = "attraction" | "hotel" | "restaurant" | "cafe" | "street_food" | "general";

const PRICE_TIER_MAP = {
    PRICE_LEVEL_FREE: { label: "Free", symbol: "Free" },
    PRICE_LEVEL_INEXPENSIVE: { label: "Inexpensive", symbol: "₹" },
    PRICE_LEVEL_MODERATE: { label: "Moderate", symbol: "₹₹" },
    PRICE_LEVEL_EXPENSIVE: { label: "Expensive", symbol: "₹₹₹" },
    PRICE_LEVEL_VERY_EXPENSIVE: { label: "Luxury", symbol: "₹₹₹₹" }
};
const LOCALIZED_PLACE_STRINGS = {
    en: {
        heading: (category, dest) => {
            const target = dest ? ` in ${dest}` : "";
            switch (category) {
                case "attraction":
                    return `🏛️ *Top Attractions${target}*`;
                case "hotel":
                    return `🏨 *Recommended Stays & Hotels${target}*`;
                case "restaurant":
                    return `🍽️ *Top Restaurants & Dining${target}*`;
                case "cafe":
                    return `☕ *Top Cafés & Bakeries${target}*`;
                case "street_food":
                    return `🍲 *Verified Local Food & Eateries${target}*`;
                default:
                    return `📍 *Recommended Places${target}*`;
            }
        },
        priceLevelLabel: (tier) => {
            const info = PRICE_TIER_MAP[tier];
            return info ? `💰 Price level: ${info.label} (${info.symbol})` : "";
        },
        openNow: "🕒 Open now",
        closedNow: "🕒 Closed now",
        reviewsCount: (count) => `${count.toLocaleString()} reviews`,
        directionsLabel: "Directions & Details",
        disclaimer: "⚠️ _Note: Ratings, details, and opening hours are from Google Places. Check Google Maps for live menus, room rates, and directions._",
        noPlacesFound: (q) => `No verified places found on Google Places matching "${q}".`
    },
    hi: {
        heading: (category, dest) => {
            const target = dest ? ` (${dest})` : "";
            switch (category) {
                case "attraction":
                    return `🏛️ *प्रमुख दर्शनीय स्थल${target}*`;
                case "hotel":
                    return `🏨 *अनुशंसित होटल और ठहरने के स्थान${target}*`;
                case "restaurant":
                    return `🍽️ *प्रमुख रेस्टोरेंट और भोजन${target}*`;
                case "cafe":
                    return `☕ *प्रमुख कैफे और बेकरी${target}*`;
                case "street_food":
                    return `🍲 *सत्यापित स्थानीय भोजन और भोजनालय${target}*`;
                default:
                    return `📍 *अनुशंसित स्थान${target}*`;
            }
        },
        priceLevelLabel: (tier) => {
            const info = PRICE_TIER_MAP[tier];
            if (!info)
                return "";
            const hiLabels = {
                Free: "निःशुल्क",
                Inexpensive: "किफायती",
                Moderate: "मध्यम",
                Expensive: "महंगा",
                Luxury: "लक्जरी"
            };
            return `💰 मूल्य स्तर: ${hiLabels[info.label] || info.label} (${info.symbol})`;
        },
        openNow: "🕒 अभी खुला है",
        closedNow: "🕒 अभी बंद है",
        reviewsCount: (count) => `${count.toLocaleString()} समीक्षाएं`,
        directionsLabel: "दिशा-निर्देश और विवरण",
        disclaimer: "⚠️ _सूचना: रेटिंग, विवरण और समय Google Places से हैं। लाइव मेनू, कमरे के किराए और दिशा-निर्देश के लिए Google Maps देखें।_",
        noPlacesFound: (q) => `Google Places पर "${q}" से संबंधित कोई सत्यापित स्थान नहीं मिला।`
    },
    mr: {
        heading: (category, dest) => {
            const target = dest ? ` (${dest})` : "";
            switch (category) {
                case "attraction":
                    return `🏛️ *प्रमुख प्रेक्षणीय स्थळे${target}*`;
                case "hotel":
                    return `🏨 *अनुशंसित हॉटेल्स आणि राहण्याची ठिकाणे${target}*`;
                case "restaurant":
                    return `🍽️ *उत्कृष्ट रेस्टॉरंट्स आणि खाद्यसंस्कृती${target}*`;
                case "cafe":
                    return `☕ *उत्कृष्ट कॅफे आणि बेकरी${target}*`;
                case "street_food":
                    return `🍲 *सत्यापित स्थानिक खाद्यपदार्थ आणि भोजनालये${target}*`;
                default:
                    return `📍 *अनुशंसित ठिकाणे${target}*`;
            }
        },
        priceLevelLabel: (tier) => {
            const info = PRICE_TIER_MAP[tier];
            if (!info)
                return "";
            const mrLabels = {
                Free: "मोफत",
                Inexpensive: "किफायतशीर",
                Moderate: "मध्यम",
                Expensive: "महाग",
                Luxury: "लक्झरी"
            };
            return `💰 किंमत श्रेणी: ${mrLabels[info.label] || info.label} (${info.symbol})`;
        },
        openNow: "🕒 आता उघडे आहे",
        closedNow: "🕒 आता बंद आहे",
        reviewsCount: (count) => `${count.toLocaleString()} परीक्षणे`,
        directionsLabel: "मार्ग आणि तपशील",
        disclaimer: "⚠️ _टीप: रेटिंग्ज, तपशील आणि वेळा Google Places वरून आहेत. मेनू, दर आणि नेव्हिगेशनसाठी Google Maps तपासा._",
        noPlacesFound: (q) => `Google Places वर "${q}" शी संबंधित कोणतेही सत्यापित ठिकाण आढळले नाही.`
    }
};
export class PlacesPresentationService {
    /**
     * Resolves appropriate category icon based on place types.
     */
    static resolveCategoryEmoji(types = []) {
        const t = types.map((s) => s.toLowerCase());
        if (t.some((x) => x.includes("lodging") || x.includes("hotel") || x.includes("resort") || x.includes("bed_and_breakfast"))) {
            return "🏨";
        }
        if (t.some((x) => x.includes("cafe") || x.includes("coffee") || x.includes("bakery"))) {
            return "☕";
        }
        if (t.some((x) => x.includes("restaurant") || x.includes("food") || x.includes("meal"))) {
            return "🍽️";
        }
        if (t.some((x) => x.includes("hindu_temple") || x.includes("place_of_worship") || x.includes("church") || x.includes("mosque"))) {
            return "🛕";
        }
        if (t.some((x) => x.includes("beach"))) {
            return "🏖️";
        }
        if (t.some((x) => x.includes("park") || x.includes("natural_feature") || x.includes("garden"))) {
            return "🌳";
        }
        if (t.some((x) => x.includes("museum") || x.includes("historical_landmark") || x.includes("monument") || x.includes("tourist_attraction") || x.includes("fort") || x.includes("landmark"))) {
            return "🏛️";
        }
        return "📍";
    }
    /**
     * Infers primary place category from query and place types.
     */
    static inferCategory(query: string, places: NormalizedPlace[]) {
        const q = query.toLowerCase();
        if (q.includes("hotel") || q.includes("stay") || q.includes("resort") || q.includes("lodge") || q.includes("homestay")) {
            return "hotel";
        }
        if (q.includes("cafe") || q.includes("coffee") || q.includes("bakery")) {
            return "cafe";
        }
        if (q.includes("street food") || q.includes("thela") || q.includes("misal") || q.includes("chaat") || q.includes("dhaba")) {
            return "street_food";
        }
        if (q.includes("restaurant") || q.includes("food") || q.includes("eat") || q.includes("dining") || q.includes("lunch") || q.includes("dinner")) {
            return "restaurant";
        }
        if (q.includes("attraction") || q.includes("visit") || q.includes("monument") || q.includes("fort") || q.includes("beach") || q.includes("temple") || q.includes("place")) {
            return "attraction";
        }
        // Infer from place items if query is generic
        if (places.length > 0 && places[0].types) {
            const firstTypes = places[0].types.map((s) => s.toLowerCase());
            if (firstTypes.some((x) => x.includes("lodging") || x.includes("hotel")))
                return "hotel";
            if (firstTypes.some((x) => x.includes("cafe") || x.includes("bakery")))
                return "cafe";
            if (firstTypes.some((x) => x.includes("restaurant")))
                return "restaurant";
            if (firstTypes.some((x) => x.includes("tourist_attraction") || x.includes("museum")))
                return "attraction";
        }
        return "general";
    }
    /**
     * Builds structured place context items for multi-turn conversational follow-ups.
     * Caps to maximum 5 items.
     */
    static buildStructuredContext(places: NormalizedPlace[]) {
        const capped = places.slice(0, 5);
        return capped.map((place, index) => {
            const mapsUrl = NavigationUrlBuilder.buildMapSearchUrl({
                placeId: place.id,
                name: place.name,
                address: place.address,
                latitude: place.location?.latitude,
                longitude: place.location?.longitude
            }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
            return {
                index: index + 1,
                placeId: place.id,
                name: place.name,
                address: place.address || undefined,
                rating: typeof place.rating === "number" && place.rating > 0 ? place.rating : undefined,
                userRatingCount: typeof place.userRatingCount === "number" && place.userRatingCount > 0 ? place.userRatingCount : undefined,
                priceLevel: place.priceLevel || undefined,
                openNow: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? undefined,
                latitude: place.location?.latitude,
                longitude: place.location?.longitude,
                mapsUrl
            };
        });
    }
    /**
     * Formats a list of normalized places into a clean WhatsApp discovery card.
     * Invariants:
     * - Maximum 5 places
     * - Plain HTTPS URLs (no square-bracket Markdown)
     * - Ratings/reviews displayed ONLY when present
     * - Price levels displayed ONLY when present
     * - Opening status displayed ONLY when verified
     */
    static formatPlacesList(params: {
        places: NormalizedPlace[];
        query: string;
        destination?: string;
        language?: SupportedLanguage;
    }) {
        const { places, query, destination, language = "en" } = params;
        const labels = LOCALIZED_PLACE_STRINGS[language] || LOCALIZED_PLACE_STRINGS.en;
        if (!places || places.length === 0) {
            return labels.noPlacesFound(query);
        }
        const capped = places.slice(0, 5);
        const category = this.inferCategory(query, capped);
        const lines = [labels.heading(category, destination), ""];
        capped.forEach((place, index) => {
            const num = index + 1;
            const emoji = this.resolveCategoryEmoji(place.types);
            const name = place.name.trim();
            lines.push(`${num}. ${emoji} *${name}*`);
            // Rating & review count (strictly data-backed)
            if (typeof place.rating === "number" && place.rating > 0) {
                const ratingStr = `⭐ ${place.rating.toFixed(1)}`;
                const reviewsStr = typeof place.userRatingCount === "number" && place.userRatingCount > 0
                    ? ` · ${labels.reviewsCount(place.userRatingCount)}`
                    : "";
                lines.push(`   ${ratingStr}${reviewsStr}`);
            }
            // Address (clean plain text)
            if (place.address && place.address.trim().length > 0) {
                lines.push(`   📍 ${place.address.trim()}`);
            }
            // Price level (strictly when supplied)
            if (place.priceLevel && PRICE_TIER_MAP[place.priceLevel]) {
                const priceStr = labels.priceLevelLabel(place.priceLevel);
                if (priceStr) {
                    lines.push(`   ${priceStr}`);
                }
            }
            // Opening hours status (strictly verified only)
            const openNow = place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow;
            if (openNow !== undefined) {
                lines.push(`   ${openNow ? labels.openNow : labels.closedNow}`);
            }
            // Authoritative Google Maps Link (plain HTTPS URL)
            const mapsUrl = NavigationUrlBuilder.buildMapSearchUrl({
                placeId: place.id,
                name: place.name,
                address: place.address,
                latitude: place.location?.latitude,
                longitude: place.location?.longitude
            }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
            lines.push(`   🗺️ ${mapsUrl}`);
            lines.push("");
        });
        lines.push(labels.disclaimer);
        return lines.join("\n").trim();
    }
}
