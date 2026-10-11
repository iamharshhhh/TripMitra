import { Router } from "express";
import { whatsappRouter } from "./whatsapp.routes.js";
import { healthRouter } from "./health.routes.js";
import { privacyRouter } from "./privacy.routes.js";

export const apiRouter = Router();
apiRouter.use("/", healthRouter);
apiRouter.use("/", privacyRouter);
apiRouter.use("/whatsapp", whatsappRouter);
