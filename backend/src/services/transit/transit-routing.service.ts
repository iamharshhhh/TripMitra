import { haversineDistanceMeters, getDestinationCoordinates } from "../../utils/geography.js";
import { NavigationUrlBuilder } from "../navigation/navigation-url.builder.js";
import { logger } from "../../utils/logger.js";

export type TransitMode = "train" | "bus" | "flight" | "road";

export type PreferredTransitMode = TransitMode | "all";

export interface TransitRouteOption {
    mode: TransitMode;
    summary: string;
    approximateDuration: string;
    approximateDistanceKm?: number;
    departureHub?: string;
    arrivalHub?: string;
    interchangePoints?: string[];
    intermediateHubs?: string[];
    routeType?: "direct" | "connecting" | "multi_modal";
    guidance: string;
    bookingSearchUrl: string;
    isVerifiedLive: boolean;
}

export interface TransitRoutePlan {
    origin: string;
    destination: string;
    preferredMode: PreferredTransitMode;
    disclaimer: string;
    routeOptions: TransitRouteOption[];
}

const CITY_TRANSIT_HUBS = {
    pune: {
        name: "Pune",
        aliases: ["pune", "poona", "punyahun", "punyatun"],
        railwayStations: ["Pune Junction (PUNE)", "Shivajinagar (SVJR)"],
        airports: [{ code: "PNQ", name: "Pune International Airport (Lohegaon)" }],
        busTerminals: ["Swargate", "Shivajinagar", "Wakad", "Katraj"]
    },
    pondicherry: {
        name: "Pondicherry",
        aliases: ["pondicherry", "puducherry", "pondy"],
        railwayStations: ["Puducherry (PDY)", "Villupuram Junction (VM - 38 km away)"],
        airports: [
            { code: "PNY", name: "Puducherry Airport" },
            { code: "MAA", name: "Chennai International Airport (145 km away)" }
        ],
        busTerminals: ["Puducherry New Bus Stand (Maraimalai Adigal)", "ECR Bus Stop"]
    },
    mumbai: {
        name: "Mumbai",
        aliases: ["mumbai", "bombay", "mumbaikar"],
        railwayStations: ["CSMT (Chhatrapati Shivaji Maharaj Terminus)", "LTT (Lokmanya Tilak Terminus)", "Bandra Terminus (BDTS)", "Mumbai Central (MMCT)"],
        airports: [{ code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport (BOM)" }],
        busTerminals: ["Borivali", "Dadar", "Vashi", "Thane"]
    },
    goa: {
        name: "Goa",
        aliases: ["goa", "madgaon", "panaji", "vasco", "margao"],
        railwayStations: ["Madgaon Junction (MAO)", "Thivim (THVM)", "Karmali (KRMI)"],
        airports: [
            { code: "GOI", name: "Dabolim Airport (GOI)" },
            { code: "GOX", name: "Manohar International Airport, Mopa (GOX)" }
        ],
        busTerminals: ["Panaji KTC Bus Stand", "Margao KTC Bus Stand", "Mapusa Bus Stand"]
    },
    bengaluru: {
        name: "Bengaluru",
        aliases: ["bengaluru", "bangalore", "blr"],
        railwayStations: ["KSR Bengaluru City (SBC)", "Yesvantpur Junction (YPR)", "SMVT Bengaluru (SMVB)"],
        airports: [{ code: "BLR", name: "Kempegowda International Airport (BLR)" }],
        busTerminals: ["Majestic (Kempegowda Bus Station)", "Shantinagar", "Satellite Bus Stand (Mysore Road)"]
    },
    chennai: {
        name: "Chennai",
        aliases: ["chennai", "madras"],
        railwayStations: ["MGR Chennai Central (MAS)", "Chennai Egmore (MS)", "Tambaram (TBM)"],
        airports: [{ code: "MAA", name: "Chennai International Airport (MAA)" }],
        busTerminals: ["Kalaignar Centenary Bus Terminus (Kilambakkam - KCBT)", "CMBT Koyambedu"]
    },
    delhi: {
        name: "Delhi",
        aliases: ["delhi", "new delhi", "dilli", "ncr"],
        railwayStations: ["New Delhi (NDLS)", "Old Delhi (DLI)", "Hazrat Nizamuddin (NZM)", "Anand Vihar (ANVT)"],
        airports: [{ code: "DEL", name: "Indira Gandhi International Airport (DEL)" }],
        busTerminals: ["ISBT Kashmere Gate", "ISBT Anand Vihar", "ISBT Sarai Kale Khan"]
    },
    jaipur: {
        name: "Jaipur",
        aliases: ["jaipur", "pink city"],
        railwayStations: ["Jaipur Junction (JP)", "Gandhinagar Jaipur (GADJ)"],
        airports: [{ code: "JAI", name: "Jaipur International Airport (JAI)" }],
        busTerminals: ["Sindhi Camp Bus Stand", "Narayan Singh Circle"]
    },
    manali: {
        name: "Manali",
        aliases: ["manali", "kullu manali"],
        railwayStations: ["Chandigarh Junction (CDG - 300 km)", "Kalka (KLK - 280 km)"],
        airports: [
            { code: "KUU", name: "Kullu-Manali Airport, Bhuntar (50 km away)" },
            { code: "IXC", name: "Chandigarh International Airport (300 km away)" }
        ],
        busTerminals: ["Manali Private Bus Stand", "Himachal Roadways Bus Stand (Mall Road)"]
    },
    ooty: {
        name: "Ooty",
        aliases: ["ooty", "udhagamandalam", "nilgiris"],
        railwayStations: ["Coimbatore Junction (CBE - 88 km)", "Mettupalayam (MTP - 52 km, Nilgiri Mountain Railway)"],
        airports: [{ code: "CJB", name: "Coimbatore International Airport (CJB - 95 km away)" }],
        busTerminals: ["Ooty Central Bus Stand", "Coimbatore Gandhipuram Bus Stand"]
    },
    hyderabad: {
        name: "Hyderabad",
        aliases: ["hyderabad", "secunderabad", "cyberabad"],
        railwayStations: ["Secunderabad Junction (SC)", "Hyderabad Deccan (HYB/Nampally)", "Kacheguda (KCG)"],
        airports: [{ code: "HYD", name: "Rajiv Gandhi International Airport (HYD)" }],
        busTerminals: ["MGBS (Mahatma Gandhi Bus Station)", "JBS (Jubilee Bus Station)"]
    },
    kolkata: {
        name: "Kolkata",
        aliases: ["kolkata", "calcutta"],
        railwayStations: ["Howrah Junction (HWH)", "Sealdah (SDAH)", "Kolkata Railway Station (KOAA)"],
        airports: [{ code: "CCU", name: "Netaji Subhash Chandra Bose International Airport (CCU)" }],
        busTerminals: ["Esplanade", "Babughat", "Karunamoyee"]
    }
};
export class TransitRoutingService {
    /**
     * Resolves a city name or alias to standard transit hub metadata.
     */
    static resolveCityHub(cityName: string) {
        if (!cityName || cityName.trim().length === 0)
            return null;
        const clean = cityName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const [, info] of Object.entries(CITY_TRANSIT_HUBS)) {
            for (const alias of info.aliases) {
                const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (clean === cleanAlias || clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
                    return info;
                }
            }
        }
        return null;
    }
    /**
     * Formats a clean booking search URL for IRCTC train search.
     */
    static buildTrainSearchUrl(origin: string, destination: string) {
        return "https://www.irctc.co.in/nget/train-search";
    }
    /**
     * Formats a clean booking search URL for Google Flights.
     */
    static buildFlightSearchUrl(origin: string, destination: string) {
        const originEnc = encodeURIComponent(origin.trim());
        const destEnc = encodeURIComponent(destination.trim());
        return `https://www.google.com/travel/flights?q=Flights+from+${originEnc}+to+${destEnc}`;
    }
    /**
     * Formats a clean booking search URL for bus tickets.
     */
    static buildBusSearchUrl(origin: string, destination: string) {
        const originSlug = origin.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const destSlug = destination.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `https://www.redbus.in/bus-tickets/${originSlug}-to-${destSlug}`;
    }
    /**
     * Formats a Google Maps driving directions deep-link.
     */
    static buildRoadNavigationUrl(origin: string, destination: string) {
        const originCoords = getDestinationCoordinates(origin);
        const destCoords = getDestinationCoordinates(destination);
        const dirUrl = NavigationUrlBuilder.buildDirectionsUrl({
            name: origin,
            latitude: originCoords?.latitude,
            longitude: originCoords?.longitude
        }, {
            name: destination,
            destinationCity: destination,
            latitude: destCoords?.latitude,
            longitude: destCoords?.longitude
        }, "driving");
        return dirUrl || `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    }
    /**
     * Generates comprehensive multi-modal transit route options between origin and destination.
     */
    static getRoutePlan(params: {
        origin: string;
        destination: string;
        preferredMode?: PreferredTransitMode;
    }) {
        const origin = params.origin.trim();
        const destination = params.destination.trim();
        const mode = params.preferredMode || "all";
        const originHub = this.resolveCityHub(origin);
        const destHub = this.resolveCityHub(destination);
        const originCoords = getDestinationCoordinates(origin);
        const destCoords = getDestinationCoordinates(destination);
        let approxDistanceKm;
        if (originCoords && destCoords) {
            const crowMeters = haversineDistanceMeters(originCoords.latitude, originCoords.longitude, destCoords.latitude, destCoords.longitude);
            // Average road tortuosity multiplier ~1.25x
            approxDistanceKm = Math.round((crowMeters * 1.25) / 1000);
        }
        const routeOptions = [];
        // 1. Specific corridor handlers & general fallback logic
        const isPunePondy = (origin.toLowerCase().includes("pune") && (destination.toLowerCase().includes("pondicherry") || destination.toLowerCase().includes("puducherry"))) ||
            (destination.toLowerCase().includes("pune") && (origin.toLowerCase().includes("pondicherry") || origin.toLowerCase().includes("puducherry")));
        const isPuneGoa = (origin.toLowerCase().includes("pune") && destination.toLowerCase().includes("goa")) ||
            (destination.toLowerCase().includes("pune") && origin.toLowerCase().includes("goa"));
        const isMumbaiPondy = (origin.toLowerCase().includes("mumbai") && (destination.toLowerCase().includes("pondicherry") || destination.toLowerCase().includes("puducherry"))) ||
            (destination.toLowerCase().includes("mumbai") && (origin.toLowerCase().includes("pondicherry") || origin.toLowerCase().includes("puducherry")));
        const isBlrPondy = ((origin.toLowerCase().includes("bangalore") || origin.toLowerCase().includes("bengaluru")) && (destination.toLowerCase().includes("pondicherry") || destination.toLowerCase().includes("puducherry"))) ||
            ((destination.toLowerCase().includes("bangalore") || destination.toLowerCase().includes("bengaluru")) && (origin.toLowerCase().includes("pondicherry") || origin.toLowerCase().includes("puducherry")));
        const isDelhiJaipur = (origin.toLowerCase().includes("delhi") && destination.toLowerCase().includes("jaipur")) ||
            (destination.toLowerCase().includes("delhi") && origin.toLowerCase().includes("jaipur"));
        // --- 🚆 TRAIN OPTIONS ---
        if (mode === "all" || mode === "train") {
            let trainSummary = `Train route between ${origin} and ${destination}`;
            let trainDuration = approxDistanceKm ? `${Math.round(approxDistanceKm / 55)}–${Math.round(approxDistanceKm / 45)} hours` : "Varies by service";
            let interchangePoints;
            let routeType = "direct";
            let guidance = `Check IRCTC for direct express trains or connecting services between ${origin} and ${destination}.`;
            if (isPunePondy) {
                trainSummary = "Direct weekly/bi-weekly trains or daily connecting trains via Chennai / Villupuram";
                trainDuration = "Approx. 24–28 hours";
                routeType = "connecting";
                interchangePoints = ["Chennai Central (MAS)", "Villupuram Junction (VM)"];
                guidance =
                    "Direct express train (e.g. Puducherry Express) operates on select scheduled days. Alternatively, take any daily superfast train from Pune to Chennai or Villupuram, and take a connecting passenger train, local bus, or taxi (approx. 40–90 mins) to Pondicherry.";
            }
            else if (isPuneGoa) {
                trainSummary = "Direct express trains (e.g. Goa Express) via Madgaon / Thivim";
                trainDuration = "Approx. 11–13 hours";
                routeType = "direct";
                guidance = "Regular express trains run from Pune Junction to Madgaon (MAO) or Thivim (THVM). Overnight options available.";
            }
            else if (isMumbaiPondy) {
                trainSummary = "Direct weekly express or daily trains via Chennai / Villupuram";
                trainDuration = "Approx. 28–32 hours";
                routeType = "connecting";
                interchangePoints = ["Chennai Egmore (MS)", "Villupuram Junction (VM)"];
                guidance = "Take direct weekly Puducherry express or daily Mumbai-Chennai trains, continuing to Pondicherry via road or rail.";
            }
            else if (isBlrPondy) {
                trainSummary = "Direct express trains or connecting trains via Villupuram";
                trainDuration = "Approx. 7–9 hours";
                routeType = "direct";
                guidance = "Regular direct trains (like Chalukya/Puducherry Express) or connecting trains via Villupuram Junction.";
            }
            else if (isDelhiJaipur) {
                trainSummary = "Direct Superfast / Vande Bharat / Shatabdi Express";
                trainDuration = "Approx. 3.5–4.5 hours";
                routeType = "direct";
                guidance = "Frequent high-speed trains including Vande Bharat Express, Ajmer Shatabdi, and Double Decker Express operate daily from NDLS/DEC to Jaipur Junction (JP).";
            }
            else if (approxDistanceKm && approxDistanceKm > 1000) {
                routeType = "connecting";
                trainDuration = `Approx. ${Math.round(approxDistanceKm / 50)}–${Math.round(approxDistanceKm / 40)} hours`;
                guidance = `Long-distance corridor. Check IRCTC for direct express trains or connecting trains via major intermediate rail junctions.`;
            }
            routeOptions.push({
                mode: "train",
                summary: trainSummary,
                approximateDuration: trainDuration,
                departureHub: originHub?.railwayStations.join(" / ") || `${origin} Station`,
                arrivalHub: destHub?.railwayStations.join(" / ") || `${destination} Station`,
                interchangePoints,
                routeType,
                guidance,
                bookingSearchUrl: this.buildTrainSearchUrl(origin, destination),
                isVerifiedLive: false
            });
        }
        // --- 🚌 BUS OPTIONS ---
        if (mode === "all" || mode === "bus") {
            let busSummary = `Intercity bus services from ${origin} to ${destination}`;
            let busDuration = approxDistanceKm ? `Approx. ${Math.round(approxDistanceKm / 45)}–${Math.round(approxDistanceKm / 35)} hours` : "Varies by operator";
            let guidance = `Overnight sleeper, semi-sleeper, and state transport buses operate on this corridor.`;
            if (isPunePondy) {
                busSummary = "Intercity sleeper buses (Direct or via Bengaluru/Chennai)";
                busDuration = "Approx. 22–26 hours";
                guidance = "Private overnight AC sleeper buses operate from Pune (Swargate/Wakad) to Pondicherry. Alternatively, travel via Bangalore with frequent connecting buses to Pondicherry (~6-7 hrs from Bangalore).";
            }
            else if (isPuneGoa) {
                busSummary = "Direct overnight AC Sleeper / Seater buses";
                busDuration = "Approx. 9–11 hours";
                guidance = "Dozens of daily overnight private and MSRTC/KSRTC AC sleeper buses depart from Pune (Swargate/Katraj/Wakad) to Panaji/Margao.";
            }
            else if (isBlrPondy) {
                busSummary = "Direct KSRTC, SETC & Private AC Sleeper/Seater buses";
                busDuration = "Approx. 6–7.5 hours";
                guidance = "High frequency daily buses from Bengaluru (Shantinagar / Madiwala / Majestic) directly to Pondicherry via Hosur-Krishnagiri-Tiruvannamalai.";
            }
            else if (isDelhiJaipur) {
                busSummary = "Direct RSRTC Volvo / AC Deluxe & Private Buses";
                busDuration = "Approx. 4.5–6 hours";
                guidance = "Buses run every 15–30 minutes from ISBT Kashmere Gate, Dhaula Kuan, and IFFCO Chowk Gurgaon to Sindhi Camp Jaipur.";
            }
            routeOptions.push({
                mode: "bus",
                summary: busSummary,
                approximateDuration: busDuration,
                departureHub: originHub?.busTerminals.join(", ") || `${origin} Bus Terminal`,
                arrivalHub: destHub?.busTerminals.join(", ") || `${destination} Bus Stand`,
                guidance,
                bookingSearchUrl: this.buildBusSearchUrl(origin, destination),
                isVerifiedLive: false
            });
        }
        // --- ✈️ FLIGHT OPTIONS ---
        if (mode === "all" || mode === "flight") {
            let flightSummary = `Flight connection from ${origin} to ${destination}`;
            let flightDuration = "Approx. 1.5–3.5 hours (plus airport transit)";
            let routeType = "direct";
            let guidance = `Check Google Flights for airline options, direct flights, and layover schedules between ${origin} and ${destination}.`;
            if (isPunePondy) {
                flightSummary = "Flight from Pune (PNQ) to Chennai (MAA) + connecting road/train to Pondicherry";
                flightDuration = "Approx. 1h 45m flight + ~3h road/taxi transfer (Total ~5–6 hours)";
                routeType = "multi_modal";
                guidance =
                    "Fly directly from Pune (PNQ) to Chennai International Airport (MAA). From Chennai airport, take a prepaid taxi, self-drive, or bus via East Coast Road (ECR) to Pondicherry (~145 km / 3 hours). Limited regional flights also occasionally operate into Pondicherry (PNY).";
            }
            else if (isPuneGoa) {
                flightSummary = "Direct non-stop flight (Pune PNQ to Goa GOI/GOX)";
                flightDuration = "Approx. 1 hour flight time";
                routeType = "direct";
                guidance = "Multiple daily non-stop flights operate between Pune and Goa (Dabolim or Mopa).";
            }
            else if (isMumbaiPondy) {
                flightSummary = "Flight from Mumbai (BOM) to Chennai (MAA) + road transfer to Pondicherry";
                flightDuration = "Approx. 2h flight + ~3h road/taxi transfer";
                routeType = "multi_modal";
                guidance = "Fly Mumbai (BOM) to Chennai (MAA) and continue by taxi/bus along scenic ECR to Pondicherry.";
            }
            else if (isBlrPondy) {
                flightSummary = "Road or direct train recommended over flight due to short distance";
                flightDuration = "Road/Bus ~6-7h vs flight connecting ~4h";
                routeType = "connecting";
                guidance = "Because Bengaluru and Pondicherry are ~310 km apart, road travel or direct train is often faster and more convenient than air travel.";
            }
            else if (isDelhiJaipur) {
                flightSummary = "Direct non-stop flight (Delhi DEL to Jaipur JAI)";
                flightDuration = "Approx. 55 minutes flight time";
                routeType = "direct";
                guidance = "Daily direct flights connect Delhi and Jaipur, though Vande Bharat train or expressway drive is comparable door-to-door.";
            }
            else if (approxDistanceKm && approxDistanceKm > 400) {
                flightDuration = `Approx. 1.5–3 hours flight time (+ connecting transit)`;
            }
            routeOptions.push({
                mode: "flight",
                summary: flightSummary,
                approximateDuration: flightDuration,
                departureHub: originHub?.airports.map((a) => `${a.name} (${a.code})`).join(", ") || `${origin} Airport`,
                arrivalHub: destHub?.airports.map((a) => `${a.name} (${a.code})`).join(", ") || `${destination} Airport`,
                routeType,
                guidance,
                bookingSearchUrl: this.buildFlightSearchUrl(origin, destination),
                isVerifiedLive: false
            });
        }
        // --- 🚗 ROAD / CAR / TAXI OPTIONS ---
        if (mode === "all" || mode === "road") {
            let distKm = approxDistanceKm || 0;
            let roadDuration = distKm > 0 ? `Approx. ${Math.round(distKm / 60)}–${Math.round(distKm / 50)} hours driving` : "Varies by route";
            let guidance = `Drive via primary National Highways or hire a private outstation cab.`;
            if (isPunePondy) {
                distKm = 1180;
                roadDuration = "Approx. 18–22 hours driving";
                guidance = "Route via NH48 (Pune → Kolhapur → Belagavi → Hubballi → Bengaluru bypass → Hosur → Krishnagiri → Tiruvannamalai → Pondicherry). Recommended as a 2-day road trip with an overnight halt at Hubballi or Bengaluru.";
            }
            else if (isPuneGoa) {
                distKm = 450;
                roadDuration = "Approx. 8.5–10 hours driving";
                guidance = "Scenic route via NH48 (Pune → Satara → Kolhapur → Nipani → Uttur → Ajara → Amboli Ghat → Sawantwadi → North/South Goa) or via Karad-Anuskura Ghat.";
            }
            else if (isMumbaiPondy) {
                distKm = 1320;
                roadDuration = "Approx. 22–25 hours driving";
                guidance = "Route via Mumbai-Pune Expressway → NH48 via Bengaluru and Krishnagiri. Best planned with an overnight stop.";
            }
            else if (isBlrPondy) {
                distKm = 310;
                roadDuration = "Approx. 5.5–6.5 hours driving";
                guidance = "Popular route via Hosur → Krishnagiri → Chengam → Tiruvannamalai → Gingee → Pondicherry (NH77) or via Chittoor-Vellore.";
            }
            else if (isDelhiJaipur) {
                distKm = 280;
                roadDuration = "Approx. 4.5–5.5 hours driving";
                guidance = "Drive via Delhi-Mumbai Expressway (NE4) or NH48 via Gurgaon, Dharuhera, Kotputli, and Shahpura.";
            }
            routeOptions.push({
                mode: "road",
                summary: `Road / Self-drive / Taxi from ${origin} to ${destination}`,
                approximateDuration: roadDuration,
                approximateDistanceKm: distKm > 0 ? distKm : undefined,
                guidance,
                bookingSearchUrl: this.buildRoadNavigationUrl(origin, destination),
                isVerifiedLive: false
            });
        }
        const disclaimer = "⚠️ Note: Schedules, journey times, and seat availability are estimates for travel guidance. Please verify live train availability on IRCTC, flights on Google Flights, and buses on booking portals before planning.";
        logger.debug({ origin, destination, preferredMode: mode, optionsCount: routeOptions.length }, "Transit route plan generated");
        return {
            origin,
            destination,
            preferredMode: mode,
            disclaimer,
            routeOptions
        };
    }
}
