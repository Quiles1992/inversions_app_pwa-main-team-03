import type { OptionStrategyContract, OptionStrategyResult, OptionStrategyInput } from "./optionsStrategyContract";
import { calculateLongCallResult } from "./options/longCall";
import { calculateLongPutResult } from "./options/longPut";
import { calculateShortCallResult } from "./options/shortCall";
import { calculateShortPutResult } from "./options/shortPut";
import { evaluateLongCall } from "./options/longCall";
import { evaluateLongPut } from "./options/longPut";
import { evaluateShortCall } from "./options/shortCall";
import { evaluateShortPut } from "./options/shortPut";
import { normalizeOptionStrategyInput } from "./options/optionMath";

export function buildOptionStrategyResult(
  params: OptionStrategyContract
): OptionStrategyResult {
  const normalizedParams = normalizeOptionStrategyInput(params);
  const direction = normalizedParams.direction;
  const optionType = normalizedParams.optionType;

  if (direction === "LONG") {
    return optionType === "CALL"
      ? evaluateLongCall(normalizedParams)
      : evaluateLongPut(normalizedParams);
  }

  return optionType === "CALL"
    ? evaluateShortCall(normalizedParams)
    : evaluateShortPut(normalizedParams);
}

/**
 * Build full candidates with complete scenario information for ranking
 */
export function buildOptionStrategyCandidates(
  baseParams: OptionStrategyContract
): OptionStrategyResult[] {
  const normalizedParams: OptionStrategyInput = normalizeOptionStrategyInput(baseParams);

  const longCall = evaluateLongCall({ ...normalizedParams, optionType: "CALL", direction: "LONG" });
  const longPut = evaluateLongPut({ ...normalizedParams, optionType: "PUT", direction: "LONG" });
  const shortCall = evaluateShortCall({ ...normalizedParams, optionType: "CALL", direction: "SHORT" });
  const shortPut = evaluateShortPut({ ...normalizedParams, optionType: "PUT", direction: "SHORT" });

  // Add ticker and direction to each result (evaluateLongCall returns OptionStrategyOutput)
  return [
    { ...longCall, ticker: baseParams.ticker, direction: "LONG" as any, optionType: "CALL" as any } as OptionStrategyResult,
    { ...longPut, ticker: baseParams.ticker, direction: "LONG" as any, optionType: "PUT" as any } as OptionStrategyResult,
    { ...shortCall, ticker: baseParams.ticker, direction: "SHORT" as any, optionType: "CALL" as any } as OptionStrategyResult,
    { ...shortPut, ticker: baseParams.ticker, direction: "SHORT" as any, optionType: "PUT" as any } as OptionStrategyResult
  ];
}
