import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
const envSchema = z.object({
    PORT: z.string().default("3000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    LOG_LEVEL: z.string().default("info"),
    MONGODB_URI: z.string().default("mongodb://localhost:27017"),
    MONGODB_DB_NAME: z.string().default("ai-travel-companion"),
    // WhatsApp Cloud API
    WHATSAPP_VERIFY_TOKEN: z.string().default(""),
    WHATSAPP_ACCESS_TOKEN: z.string().default(""),
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
    WHATSAPP_API_VERSION: z.string().default("v21.0"),
    WHATSAPP_APP_SECRET: z.string().optional(),
    // Google Gemini AI Generation
    GEMINI_API_KEY: z.string().default(""),
    GEMINI_MODEL: z.string().default("gemini-3.6-flash"),
    GEMINI_TIMEOUT_MS: z.coerce.number().default(30000),
    GEMINI_EMBEDDING_MODEL: z.string().default("text-embedding-004"),
    GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
    AI_MAX_HISTORY_MESSAGES: z.coerce.number().default(10),
    // Tools & External Services
    WEATHER_TIMEOUT_MS: z.coerce.number().default(10000),
    GOOGLE_PLACES_API_KEY: z.string().optional(),
    GOOGLE_PLACES_TIMEOUT_MS: z.coerce.number().default(10000),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    GROK_API_KEY: z.string().optional(),
    // RAG Configuration
    RAG_CHUNK_SIZE: z.coerce.number().default(500),
    RAG_CHUNK_OVERLAP: z.coerce.number().default(50),
    RAG_TOP_K: z.coerce.number().default(5),
    RAG_NUM_CANDIDATES: z.coerce.number().default(20),
    PROACTIVE_ALERT_COOLDOWN_HOURS: z.coerce.number().default(6),
    WEATHER_FORECAST_HORIZON_DAYS: z.coerce.number().default(7),
    WEATHER_PRECIPITATION_THRESHOLD: z.coerce.number().default(50),
    BUDGET_DEFAULT_CURRENCY: z.string().default("INR"),
    WHATSAPP_MAX_MESSAGE_CHARACTERS: z.coerce.number().default(4096),
    AI_MAX_TOOL_CALLS: z.coerce.number().default(5),
}).superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
        if (!data.WHATSAPP_APP_SECRET || data.WHATSAPP_APP_SECRET.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["WHATSAPP_APP_SECRET"],
                message: "WHATSAPP_APP_SECRET is mandatory when NODE_ENV is 'production'",
            });
        }
    }
});
export const env = envSchema.parse(process.env);
