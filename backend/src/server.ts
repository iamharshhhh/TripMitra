import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

async function bootstrap() {
    await connectDatabase();
    const server = app.listen(Number(env.PORT), () => {
        logger.info(`🚀 TripMitra API listening on port ${env.PORT}`);
    });
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        server.close(async () => {
            await disconnectDatabase();
            logger.info("Closed HTTP server and disconnected database.");
            process.exit(0);
        });
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
bootstrap().catch((err) => {
    logger.error({ err: err.message }, "Server startup failed");
    process.exit(1);
});
