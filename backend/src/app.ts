import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiRouter } from "./routes/index.js";
import { privacyRouter } from "./routes/privacy.routes.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();
// Security & Parsing Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));
// Observability Middlewares
app.use(requestId);
app.use(requestLogger);
// Meta App & Direct Root Routes
app.use("/", privacyRouter);
// API Version 1 Routes
app.use("/api/v1", apiRouter);
// 404 Route Catch-All
app.use(notFoundHandler);
// Global Centralized Error Handler
app.use(errorHandler);
