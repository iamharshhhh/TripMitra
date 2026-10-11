import { Router } from "express";
import { PrivacyController } from "../controllers/privacy.controller.js";

export const privacyRouter = Router();
privacyRouter.get("/privacy-policy", PrivacyController.getPrivacyPolicy);
