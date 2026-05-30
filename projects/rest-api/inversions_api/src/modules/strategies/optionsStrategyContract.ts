// FIC: Canonical contract types for all option strategy modules (Team-03). (EN)
// FIC: Tipos de contrato canónicos para todos los módulos de estrategia de opciones (Team-03). (ES)

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OptionType = "CALL" | "PUT";
export type OptionDirection = "LONG" | "SHORT";
export type RiskTolerance = "LOW" | "MEDIUM" | "HIGH";
export type TimeDecayModel = "LINEAR" | "EXPONENTIAL";

// ─── Input types ──────────────────────────────────────────────────────────────

/**
 * FIC: Raw API contract — the shape clients send to POST /api/team-03/options/*.
 * Field names may be lowercase; normalization is done by optionMath.normalizeOptionStrategyInput().
 *
 * FIC: Contrato crudo de la API — la forma que los clientes envían a POST /api/team-03/options/*.
 * Los nombres de campo pueden estar en minúsculas; la normalización la hace optionMath.normalizeOptionStrategyInput().
 */
export interface OptionStrategyContract {
  ticker: string;
  optionType: string;           // "call" | "put" (lowercase accepted)
  direction: string;            // "long" | "short" (lowercase accepted)
  strikePrice: number;
  expirationDate: string;       // ISO 8601
  premium: number;              // premium per contract (maps to premiumPerContract)
  quantity: number;             // number of contracts (maps to numberOfContracts)
  capitalAvailable?: number;    // defaults to 10000
  riskTolerance?: string;       // "LOW" | "MEDIUM" | "HIGH" (defaults to "MEDIUM")
  currentPrice?: number;        // defaults to strikePrice
  daysToExpiration?: number;    // computed from expirationDate if not provided
  premiumPerContract?: number;  // alias for premium (used internally)
  numberOfContracts?: number;   // alias for quantity (used internally)
  availableCapital?: number;    // alias for capitalAvailable (used internally)
  assumptions?: {
    impliedVolatility?: number;
    timeDecayModel?: TimeDecayModel;
    interestRate?: number;
    expectedReturn?: number;
  };
}

/**
 * FIC: Normalized, validated input for internal strategy calculations.
 * All fields are required and properly typed after normalization.
 *
 * FIC: Entrada normalizada y validada para cálculos internos de estrategias.
 * Todos los campos son requeridos y correctamente tipados después de la normalización.
 */
export interface OptionStrategyInput {
  ticker: string;
  optionType: OptionType;
  direction: OptionDirection;
  strikePrice: number;
  currentPrice: number;
  expirationDate: string;
  daysToExpiration: number;
  premiumPerContract: number;
  numberOfContracts: number;
  availableCapital: number;
  riskTolerance: RiskTolerance;
  assumptions: {
    impliedVolatility?: number;
    timeDecayModel?: TimeDecayModel;
    interestRate?: number;
    expectedReturn?: number;
  };
}

// ─── Output types ─────────────────────────────────────────────────────────────

/**
 * FIC: A single price scenario result (ATM, +5%, -5%).
 * FIC: Un resultado de escenario de precio individual (ATM, +5%, -5%).
 */
export interface PriceScenario {
  priceMovement: string;
  priceAtScenario: number;
  profitLoss: number;
  roi: number;
}

/**
 * FIC: Full output of an option strategy evaluation.
 * Returned by evaluateLongCall, evaluateLongPut, evaluateShortCall, evaluateShortPut.
 *
 * FIC: Salida completa de una evaluación de estrategia de opciones.
 * Retornada por evaluateLongCall, evaluateLongPut, evaluateShortCall, evaluateShortPut.
 */
export interface OptionStrategyOutput {
  ticker: string;
  optionType: OptionType;
  direction: OptionDirection;
  premium: number;
  quantity: number;
  breakEvenPrice: number;
  maxProfit: number;
  maxLoss: number;
  requiredMargin: number;
  scenarioAtm: PriceScenario;
  scenarioPlus5: PriceScenario;
  scenarioMinus5: PriceScenario;
  riskAdjustedReturn: number;
  probabilityItm: number;
  warnings: string[];
  calculatedAt: string;
  calculationVersion: string;
  assumptions: {
    impliedVolatility?: number;
    timeDecayModel?: TimeDecayModel;
    interestRate?: number;
    expectedReturn?: number;
  };
}

/**
 * FIC: Alias used by optionsStrategyService.ts — same shape as OptionStrategyOutput.
 * FIC: Alias usado por optionsStrategyService.ts — misma forma que OptionStrategyOutput.
 */
export type OptionStrategyResult = OptionStrategyOutput;
