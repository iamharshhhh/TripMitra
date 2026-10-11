import { HealthService } from "../services/health.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export class HealthController {
    static getHealth = asyncHandler((_req, res) => {
        const health = HealthService.getHealthStatus();
        res.status(200).json(health);
    });
    static getReadiness = asyncHandler((_req, res) => {
        const readiness = HealthService.getReadinessStatus();
        const statusCode = readiness.success ? 200 : 503;
        res.status(statusCode).json(readiness);
    });
}
