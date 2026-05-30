// FIC: Mock optionsAnalysisCore
export const generateOptionsAnswer = (...args: any[]) => ({
  answer: "AI Analysis",
  references: [],
  confidence: "HIGH",
  intent: "info",
  strategyFocus: "long_call"
}) as any;
export interface OptionsQARequest {
  query?: string;
  question?: string;
  ticker?: string;
  strategies?: any[];
  dashboardContext?: any;
  selectedStrategy?: any;
  currentPrice?: number;
}
export type StrategyKey = any;
export type StrategiesSnapshot = any;
export type DashboardContext = any;
