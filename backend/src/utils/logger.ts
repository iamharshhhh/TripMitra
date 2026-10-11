import pino from "pino";
import { env } from "../config/env.js";

const isDev = env.NODE_ENV !== "production";
export function maskPhoneNumber(phone: string) {
    if (!phone || phone.length < 6)
        return "***";
    const start = phone.slice(0, 3);
    const end = phone.slice(-3);
    return `${start}****${end}`;
}
export const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: [
            "*.token",
            "*.*token*",
            "*.*key*",
            "*.*password*",
            "authorization",
            "headers.authorization",
            "req.headers.authorization",
            "payload.*token*",
            "payload.*key*"
        ],
        censor: "[REDACTED]"
    },
    transport: isDev
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname"
            }
        }
        : undefined
});
