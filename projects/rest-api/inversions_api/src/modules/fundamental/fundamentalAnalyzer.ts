// FIC: Mock fundamental analyzer

import type { FundamentalAnalysisData } from "./fundamentalSourceContract";

export interface AnalysisOptions {
  investmentProfile: string;
  horizon: string;
  selectedMetrics: string[];
  strategy: string;
  comparisons: string[];
  projectionFrom?: string;
  projectionTo?: string;
}

export async function analyzeFundamental(data: FundamentalAnalysisData, opts: AnalysisOptions) {
  return {
    overallScore: 7.5,
    verdict: "COMPRAR",
    companyName: data.companyName,
    sourceId: data.metadata.sourceId,
    recommendation: { summary: "Good valuation" },
    projection: { target: 180 },
    aiAnalysis: { text: "AI says it is a solid pick." },
    sections: [],
    confluenceRows: [],
    timestamp: new Date().toISOString()
  };
}
