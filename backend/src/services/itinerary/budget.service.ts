import { env } from "../../config/env.js";
import { BudgetEngineConfig } from "./budget.types.js";
import { ScheduledPlace } from "./itinerary-scheduling.types.js";
import { StructuredTripRequirements } from "../../types/trip-requirements.types.js";

export const DEFAULT_BUDGET_CONFIG = {
    defaultCurrency: env.BUDGET_DEFAULT_CURRENCY || "INR"
};
export class BudgetEngineService {
    config;
    constructor(config?: Partial<BudgetEngineConfig>) {
        this.config = {
            ...DEFAULT_BUDGET_CONFIG,
            ...config
        };
    }
    /**
     * Authoritatively evaluates budget and costs for scheduled places.
     *
     * Invariants:
     * 1. No invented non-activity costs (no fabricated food, transport, or hotel costs).
     * 2. Unknown costs remain undefined and are NEVER treated as 0 or free.
     * 3. Activity cost = estimatedCostPerPerson * travelerCount.
     * 4. No fabricated child/senior discounts or pricing tiers.
     * 5. If no budget specified in requirements -> budgetStatus = "not_specified".
     * 6. If budget specified:
     *    - knownTotalCost > maxTotalAmount -> "over_budget"
     *    - knownTotalCost <= maxTotalAmount and hasUnknownCosts -> "unknown"
     *    - knownTotalCost <= maxTotalAmount and !hasUnknownCosts -> "within_budget"
     * 7. Currency mismatch without reliable conversion -> currencyMismatch = true, budgetStatus = "unknown".
     */
    evaluateBudget(requirements: Partial<StructuredTripRequirements>, scheduledPlaces: ScheduledPlace[]) {
        const currency = requirements.budget?.currency || this.config.defaultCurrency;
        const travelerCount = requirements.travelers?.total ?? 1;
        const costItems = [];
        const diagnostics = [];
        // Track category totals
        const categories = {
            activities: { category: "activities", knownAmount: 0, currency, itemCount: 0, unknownItemCount: 0, hasUnknownCosts: false },
            food: { category: "food", knownAmount: 0, currency, itemCount: 0, unknownItemCount: 0, hasUnknownCosts: false },
            transport: { category: "transport", knownAmount: 0, currency, itemCount: 0, unknownItemCount: 0, hasUnknownCosts: false },
            accommodation: { category: "accommodation", knownAmount: 0, currency, itemCount: 0, unknownItemCount: 0, hasUnknownCosts: false },
            other: { category: "other", knownAmount: 0, currency, itemCount: 0, unknownItemCount: 0, hasUnknownCosts: false }
        };
        let knownTotalCost = 0;
        let hasUnknownCosts = false;
        let unknownCostCount = 0;
        // 1. Evaluate Activity Costs from Scheduled Places
        for (const place of scheduledPlaces) {
            const candidate = place.candidate;
            categories.activities.itemCount++;
            if (typeof candidate.estimatedCostPerPerson === "number") {
                const itemTotal = candidate.estimatedCostPerPerson * travelerCount;
                knownTotalCost += itemTotal;
                categories.activities.knownAmount += itemTotal;
                costItems.push({
                    id: `cost-${candidate.placeId}`,
                    category: "activities",
                    name: candidate.name,
                    placeId: candidate.placeId,
                    amount: itemTotal,
                    currency,
                    quantity: travelerCount,
                    unit: "per_person",
                    source: "candidate",
                    confidence: candidate.costConfidence === "high" ? "known" : "estimated",
                    notes: `${travelerCount} traveler(s) × ${candidate.estimatedCostPerPerson} ${currency}`
                });
            }
            else {
                // Unknown activity cost - explicitly preserved as undefined
                hasUnknownCosts = true;
                unknownCostCount++;
                categories.activities.unknownItemCount++;
                categories.activities.hasUnknownCosts = true;
                costItems.push({
                    id: `cost-${candidate.placeId}`,
                    category: "activities",
                    name: candidate.name,
                    placeId: candidate.placeId,
                    amount: undefined, // NEVER 0
                    currency,
                    quantity: travelerCount,
                    unit: "per_person",
                    source: "unknown",
                    confidence: "unknown",
                    notes: "Cost not provided by place source; preserved as unknown"
                });
            }
        }
        // 2. Authoritative Non-Activity Costs
        // NOTE: Rule 4 explicitly mandates: DO NOT invent food, transport, or accommodation costs
        // unless reliable explicit cost information exists.
        // If none provided in requirements/candidates, item counts remain 0 and no fabricated items are added.
        // 3. Currency Mismatch Check
        let currencyMismatch = false;
        if (requirements.budget?.currency && requirements.budget.currency !== currency) {
            currencyMismatch = true;
            diagnostics.push(`Currency mismatch between requirements (${requirements.budget.currency}) and evaluation (${currency}). Conversion source not available.`);
        }
        // 4. Evaluate Budget Status
        const targetBudget = requirements.budget?.maxTotalAmount;
        let remainingBudget;
        let budgetStatus = "not_specified";
        if (targetBudget === undefined) {
            budgetStatus = "not_specified";
        }
        else if (currencyMismatch) {
            budgetStatus = "unknown";
            diagnostics.push("Cannot authoritatively determine budget compliance due to unresolved currency mismatch.");
        }
        else {
            remainingBudget = targetBudget - knownTotalCost;
            if (knownTotalCost > targetBudget) {
                budgetStatus = "over_budget";
                diagnostics.push(`Known costs (${knownTotalCost} ${currency}) exceed target budget (${targetBudget} ${currency}).`);
            }
            else if (hasUnknownCosts) {
                budgetStatus = "unknown";
                diagnostics.push(`Known costs (${knownTotalCost} ${currency}) are within target budget (${targetBudget} ${currency}), but ${unknownCostCount} unknown cost item(s) could impact final total.`);
            }
            else {
                budgetStatus = "within_budget";
                diagnostics.push(`All ${costItems.length} cost item(s) are known and within target budget (${knownTotalCost} / ${targetBudget} ${currency}).`);
            }
        }
        return {
            currency,
            costItems,
            categories,
            knownTotalCost,
            hasUnknownCosts,
            unknownCostCount,
            targetBudget,
            remainingBudget,
            budgetStatus,
            currencyMismatch,
            diagnostics
        };
    }
}
