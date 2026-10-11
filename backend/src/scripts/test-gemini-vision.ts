import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

async function test() {
    console.log("Model in env:", env.GEMINI_MODEL);
    console.log("API Key prefix:", env.GEMINI_API_KEY.substring(0, 8));
    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    // 1x1 black pixel PNG base64
    const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    console.log("\n--- Testing Text-Only Call ---");
    try {
        const textRes = await client.models.generateContent({
            model: env.GEMINI_MODEL,
            contents: [{ role: "user", parts: [{ text: "Hello, reply with 'test ok'" }] }]
        });
        console.log("Text response:", textRes.text);
    } catch (err: any) {
        console.error("Text call error:", err.message || err);
    }

    console.log("\n--- Testing Vision Call with", env.GEMINI_MODEL, "---");
    try {
        const start = Date.now();
        const visionRes = await client.models.generateContent({
            model: env.GEMINI_MODEL,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: samplePngBase64
                            }
                        },
                        {
                            text: "What color is this 1x1 image? Reply in 3 words."
                        }
                    ]
                }
            ]
        });
        console.log("Vision response in", Date.now() - start, "ms:", visionRes.text);
    } catch (err: any) {
        console.error("Vision call error:", err.message || err);
    }
}

test();
