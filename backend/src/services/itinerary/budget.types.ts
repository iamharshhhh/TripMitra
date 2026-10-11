export type CostCategory = "activities" | "food" | "transport" | "accommodation" | "other";
export type CostItemSource = "candidate" | "user_requirement" | "system_default" | "unknown";
export type CostConfidence = "known" | "estimated" | "unknown";
export interface CostItem {
    id: string;
    category: CostCategory;
    name: string;
    placeId?: string;
    amount?: number;
    currency: string;
    quantity: number;
    unit: string;
    source: CostItemSource;
    confidence: CostConfidence;
    notes?: string;
}
export interface CategoryCostSummary {
    category: CostCategory;
    knownAmount: number;
    currency: string;
    itemCount: number;
    unknownItemCount: number;
    hasUnknownCosts: boolean;
}
export type BudgetStatus = "within_budget" | "over_budget" | "unknown" | "not_specified";
export interface BudgetEvaluationResult {
    currency: string;
    costItems: CostItem[];
    categories: Record<CostCategory, CategoryCostSummary>;
    knownTotalCost: number;
    hasUnknownCosts: boolean;
    unknownCostCount: number;
    targetBudget?: number;
    remainingBudget?: number;
    budgetStatus: BudgetStatus;
    currencyMismatch: boolean;
    diagnostics: string[];
}
export interface BudgetEngineConfig {
    defaultCurrency: string;
}
