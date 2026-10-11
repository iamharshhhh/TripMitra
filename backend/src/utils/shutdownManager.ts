import { logger } from "./logger.js";
import http from "http";

type CleanupHandler = () => Promise<void> | void;

export class ShutdownManager {
    static cleanupHandlers: Array<{ name: string; handler: CleanupHandler }> = [];
    static isShuttingDown = false;
    static registerCleanupHandler(name: string, handler: CleanupHandler) {
        this.cleanupHandlers.push({ name, handler });
    }
    static init(server: http.Server) {
        const handleSignal = (signal: string) => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            logger.info(`Received ${signal}. Starting graceful shutdown...`);
            server.close(async (err) => {
                if (err) {
                    logger.error({ err: err.message }, "Error closing HTTP server");
                    process.exit(1);
                }
                logger.info("HTTP server closed. Executing cleanup handlers...");
                for (const { name, handler } of this.cleanupHandlers) {
                    try {
                        logger.info(`Running cleanup: ${name}`);
                        await handler();
                    }
                    catch (cleanupErr) {
                        const msg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
                        logger.error({ err: msg, name }, "Error running cleanup handler");
                    }
                }
                logger.info("Graceful shutdown completed successfully.");
                process.exit(0);
            });
            // Force exit if shutdown takes too long (> 10s)
            setTimeout(() => {
                logger.error("Graceful shutdown timed out. Forcefully terminating.");
                process.exit(1);
            }, 10000).unref();
        };
        process.on("SIGTERM", () => handleSignal("SIGTERM"));
        process.on("SIGINT", () => handleSignal("SIGINT"));
    }
}
