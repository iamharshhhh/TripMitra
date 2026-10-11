
/**
 * Pure deterministic interest normalization and canonicalization utility.
 */
export const CANONICAL_INTEREST_MAP: Record<string, string> = {
    // Nature & Outdoors
    nature: "nature_outdoors",
    nature_outdoors: "nature_outdoors",
    "nature & outdoors": "nature_outdoors",
    "nature and outdoors": "nature_outdoors",
    outdoors: "nature_outdoors",
    scenic: "nature_outdoors",
    parks: "nature_outdoors",
    wildlife: "nature_outdoors",
    // Religious & Spiritual
    religious_spiritual: "religious_spiritual",
    spiritual: "religious_spiritual",
    temple: "religious_spiritual",
    temples: "religious_spiritual",
    "temples & spiritual": "religious_spiritual",
    "temples and spiritual": "religious_spiritual",
    religious: "religious_spiritual",
    pilgrimage: "religious_spiritual",
    // History & Culture
    history_culture: "history_culture",
    historic: "history_culture",
    history: "history_culture",
    culture: "history_culture",
    "history & culture": "history_culture",
    "history and culture": "history_culture",
    heritage: "history_culture",
    monuments: "history_culture",
    forts: "history_culture",
    palaces: "history_culture",
    // Beaches & Coastal
    beaches_coastal: "beaches_coastal",
    beach: "beaches_coastal",
    beaches: "beaches_coastal",
    "beaches & coastal": "beaches_coastal",
    "beaches and coastal": "beaches_coastal",
    beaches_water: "beaches_coastal",
    coastal: "beaches_coastal",
    // Food & Culinary
    food_culinary: "food_culinary",
    food: "food_culinary",
    culinary: "food_culinary",
    dining: "food_culinary",
    "food & culinary": "food_culinary",
    "food and culinary": "food_culinary",
    "street food": "food_culinary",
    street_food: "food_culinary",
    gastronomy: "food_culinary",
    // Shopping & Markets
    shopping_markets: "shopping_markets",
    shopping: "shopping_markets",
    markets: "shopping_markets",
    "shopping & markets": "shopping_markets",
    "shopping and markets": "shopping_markets",
    bazaars: "shopping_markets",
    // Adventure & Sports
    adventure_sports: "adventure_sports",
    adventure: "adventure_sports",
    sports: "adventure_sports",
    "adventure & sports": "adventure_sports",
    "adventure and sports": "adventure_sports",
    trekking: "adventure_sports",
    hiking: "adventure_sports",
    // Nightlife & Entertainment
    nightlife_entertainment: "nightlife_entertainment",
    nightlife: "nightlife_entertainment",
    entertainment: "nightlife_entertainment",
    "nightlife & entertainment": "nightlife_entertainment",
    "nightlife and entertainment": "nightlife_entertainment",
    pubs: "nightlife_entertainment",
    clubs: "nightlife_entertainment",
    // Photography & Scenic Views
    photography: "photography",
    photo: "photography",
    photos: "photography",
    sightseeing: "photography",
    // Art & Museums
    art_museums: "art_museums",
    art: "art_museums",
    museums: "art_museums",
    museum: "art_museums",
    "art & museums": "art_museums",
    "art and museums": "art_museums",
    galleries: "art_museums",
    // Relaxation & Wellness
    relaxation_wellness: "relaxation_wellness",
    relaxation: "relaxation_wellness",
    wellness: "relaxation_wellness",
    spa: "relaxation_wellness",
    resort: "relaxation_wellness",
    "relaxation & wellness": "relaxation_wellness",
    "relaxation and wellness": "relaxation_wellness"
};
/**
 * Normalizes a single raw interest string to its canonical slug.
 * Trims whitespace, removes leading emojis/bullets, lowercases, and maps synonyms.
 * Unrecognized custom interests are preserved in trimmed lowercase format.
 */
export function canonicalizeInterest(raw: string) {
    if (!raw || typeof raw !== "string")
        return "";
    // Strip leading emojis, bullets, hyphens, and whitespace
    let cleaned = raw
        .replace(/^[\s\u200B-\u200D\uFEFF•\-*▪▫🌿⛪🏛🏖🍲🛍🧗🎉📸🎨]+/u, "")
        .trim()
        .toLowerCase();
    // Normalize internal whitespace
    cleaned = cleaned.replace(/\s+/g, " ");
    if (CANONICAL_INTEREST_MAP[cleaned]) {
        return CANONICAL_INTEREST_MAP[cleaned];
    }
    // Check underscore variant
    const underscoreVariant = cleaned.replace(/\s+/g, "_");
    if (CANONICAL_INTEREST_MAP[underscoreVariant]) {
        return CANONICAL_INTEREST_MAP[underscoreVariant];
    }
    return underscoreVariant || cleaned;
}
/**
 * Deduplicates an array of interest strings into a unique array of canonical slugs.
 * Preserves the original discovery order of the first occurrence of each unique interest.
 */
export function deduplicateInterests(interests: string[] | null) {
    if (!Array.isArray(interests) || interests.length === 0) {
        return [];
    }
    const seen = new Set();
    const result = [];
    for (const item of interests) {
        const canonical = canonicalizeInterest(item);
        if (canonical && !seen.has(canonical)) {
            seen.add(canonical);
            result.push(canonical);
        }
    }
    return result;
}
