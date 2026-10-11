import { logger } from "../../utils/logger.js";
import { FetchKnowledgeParams, KnowledgeSourceProvider } from "./knowledgeSource.interface.js";

export class MockExternalApiKnowledgeProvider implements KnowledgeSourceProvider {
    name = "mock-tourism-api";
    sourceType = "external_api" as const;
    mockDatabase = {
        pune: [
            {
                id: "pune-attraction-001",
                name: "Shaniwar Wada Palace Fort",
                category: "attractions",
                description: "Shaniwar Wada is an 18th-century palace fortification in the heart of Pune, Maharashtra. Built in 1732 by Peshwa Baji Rao I, prime minister of the Maratha Empire, it served as the royal seat of the Peshwas until 1818. Famous for its massive teakwood Dilli Darwaja (Delhi Gate) equipped with anti-elephant steel spikes, the Hazari Karanje (thousand-jet lotus fountain), and imposing stone ramparts. Located in Shaniwar Peth near Kasba Peth.",
                location: {
                    city: "Pune",
                    state: "Maharashtra",
                    country: "India",
                    neighborhood: "Shaniwar Peth"
                },
                highlights: [
                    "Dilli Darwaja with defensive elephant spikes",
                    "Hazari Karanje lotus fountain",
                    "Historic seat of Maratha Peshwa rulers"
                ],
                tags: ["history", "heritage", "maratha", "peshwa", "fort"],
                sourceUrl: "https://api.tourism.example.com/destinations/pune/places/pune-attraction-001",
                lastUpdated: "2026-08-15T10:00:00Z"
            },
            {
                id: "pune-attraction-002",
                name: "Aga Khan Palace",
                category: "attractions",
                description: "Aga Khan Palace was built in 1892 by Sultan Muhammed Shah Aga Khan III in Yerawada, Pune. A majestic monument featuring Italian arches, stone verandas, and 19 acres of manicured gardens. It holds immense national significance as the place where Mahatma Gandhi, Kasturba Gandhi, and Mahadev Desai were interned following the 1942 Quit India Resolution. Today it houses Gandhi memorials, personal artifacts, and ash memorials.",
                location: {
                    city: "Pune",
                    state: "Maharashtra",
                    country: "India",
                    neighborhood: "Yerawada"
                },
                highlights: [
                    "Italianate arches and 19-acre lawns",
                    "Quit India movement historical site",
                    "Mahatma Gandhi and Kasturba Gandhi memorials"
                ],
                tags: ["history", "gandhi", "freedom-struggle", "memorial"],
                sourceUrl: "https://api.tourism.example.com/destinations/pune/places/pune-attraction-002",
                lastUpdated: "2026-08-10T12:00:00Z"
            },
            {
                id: "pune-attraction-003",
                name: "Sinhagad Fort",
                category: "attractions",
                description: "Sinhagad (Lion Fort) is an ancient hill fortress perched on an isolated cliff of the Sahyadri mountains, approximately 30 km southwest of Pune city center. Renowned for the historic Battle of Sinhagad in 1670 where Maratha commander Tanaji Malusare recaptured the fortress. A prominent destination for trekking, offering views of Khadakwasla Dam and famous local Maharashtrian dishes like pithla bhakri, thecha, and kanda bhaji.",
                location: {
                    city: "Pune",
                    state: "Maharashtra",
                    country: "India",
                    neighborhood: "Sinhagad Ghat"
                },
                highlights: [
                    "Historical 1670 battle site of Tanaji Malusare",
                    "Scenic trekking trails and Sahyadri panoramas",
                    "Authentic rustic Maharashtrian cuisine"
                ],
                tags: ["fort", "trekking", "monsoon", "sahayadri", "culinary"],
                sourceUrl: "https://api.tourism.example.com/destinations/pune/places/pune-attraction-003",
                lastUpdated: "2026-08-01T08:30:00Z"
            },
            {
                id: "pune-attraction-004",
                name: "Shrimant Dagdusheth Halwai Ganpati Temple",
                category: "culture",
                description: "The Shrimant Dagdusheth Halwai Ganpati Temple is one of the most revered Hindu temples in Maharashtra, located in Budhwar Peth, Pune. Founded in 1893 by sweetmaker Dagdusheth Gadve and his wife Lakshmibai after the devastating plague, it became a focal point of Lokmanya Tilak's public Ganeshotsav celebrations. The temple features an ornate golden idol of Lord Ganesha and draws millions of devotees annually.",
                location: {
                    city: "Pune",
                    state: "Maharashtra",
                    country: "India",
                    neighborhood: "Budhwar Peth"
                },
                highlights: [
                    "Gold-adorned idol of Lord Ganesha",
                    "Epicenter of Pune public Ganeshotsav festival",
                    "Centrally located near old city markets"
                ],
                tags: ["temple", "ganpati", "spiritual", "culture", "festival"],
                sourceUrl: "https://api.tourism.example.com/destinations/pune/places/pune-attraction-004",
                lastUpdated: "2026-08-20T14:00:00Z"
            }
        ]
    };
    /**
     * Simulates an external HTTP request to fetch tourism data.
     * In a production provider, this would be an axios/fetch call to an external API endpoint.
     */
    async fetchKnowledge(params: FetchKnowledgeParams) {
        const destinationSlug = params?.destinationSlug ?? "pune";
        logger.debug({ provider: this.name, destinationSlug }, "Simulating external REST API call for tourism places");
        const rawRecords = this.mockDatabase[destinationSlug] || [];
        // Transform external raw schema into NormalizedKnowledgeDocument
        const normalizedDocs = rawRecords.map((raw) => {
            const contentParts = [
                `# ${raw.name}`,
                raw.description,
                `\n### Key Highlights\n${raw.highlights.map((h) => `- ${h}`).join("\n")}`,
                `\n### Location & Vicinity\nCity: ${raw.location.city}, State: ${raw.location.state}, Country: ${raw.location.country}${raw.location.neighborhood ? `, Area: ${raw.location.neighborhood}` : ""}`
            ];
            return {
                documentId: `mock-api:${destinationSlug}:${raw.id}`,
                destination: raw.location.city,
                destinationSlug,
                country: raw.location.country,
                state: raw.location.state,
                city: raw.location.city,
                category: raw.category,
                title: raw.name,
                content: contentParts.join("\n\n"),
                tags: raw.tags,
                source: this.name,
                sourceType: this.sourceType,
                sourceUrl: raw.sourceUrl,
                externalId: raw.id,
                lastUpdated: new Date(raw.lastUpdated),
                metadata: {
                    externalApiVersion: "1.0",
                    rawId: raw.id,
                    neighborhood: raw.location.neighborhood
                }
            };
        });
        logger.info({ provider: this.name, destinationSlug, count: normalizedDocs.length }, "Normalized external API tourism records");
        return normalizedDocs;
    }
}
