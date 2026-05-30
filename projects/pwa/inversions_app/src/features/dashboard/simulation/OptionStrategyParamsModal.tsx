import React, { useEffect, useMemo, useState } from "react";
import { Play, Shield } from "lucide-react";
import { ContentModal } from "../../../components/ui/ContentModal";
import { getMarketQuotes } from "../../../services/signals/marketApi";
import { useSignalStore } from "../../../store/signals";

export type CoreOptionStrategy = "BUY_CALL" | "BUY_PUT" | "SELL_CALL" | "SELL_PUT";

interface Props {
  open: boolean;
  strategy: CoreOptionStrategy;
  ticker: string;
  onClose: () => void;
}

interface FormState {
  ticker: string;
  currentPrice: string;
  strikePrice: string;
  premium: string;
  contracts: string;
  expiration: string;
  capital: string;
  impliedVolatility: string;
  thetaDecay: "LINEAR" | "EXPONENTIAL";
  riskFreeRate: string;
}

interface StrategyResult {
  maxProfit: number | "Ilimitado";
  maxLoss: number | "Ilimitado";
  breakeven: number;
  netPremium: number;
  requiredMargin: number;
  scenarioAtm: number;
  scenarioPlus5: number;
  scenarioMinus5: number;
}

const STRATEGY_COPY: Record<CoreOptionStrategy, {
  title: string;
  optionType: "CALL" | "PUT";
  direction: "LONG" | "SHORT";
  description: string;
  risk: "limitado" | "ilimitado";
  bias: "bullish" | "bearish";
  premiumLabel: string;
}> = {
  BUY_CALL: {
    title: "Long Call",
    optionType: "CALL",
    direction: "LONG",
    description: "Compra de call. Derecho a comprar al strike.",
    risk: "limitado",
    bias: "bullish",
    premiumLabel: "Prima pagada $",
  },
  BUY_PUT: {
    title: "Long Put",
    optionType: "PUT",
    direction: "LONG",
    description: "Compra de put. Derecho a vender al strike.",
    risk: "limitado",
    bias: "bearish",
    premiumLabel: "Prima pagada $",
  },
  SELL_CALL: {
    title: "Short Call",
    optionType: "CALL",
    direction: "SHORT",
    description: "Venta de call. Recibes prima, pero asumes riesgo si el precio sube.",
    risk: "ilimitado",
    bias: "bearish",
    premiumLabel: "Prima recibida $",
  },
  SELL_PUT: {
    title: "Short Put",
    optionType: "PUT",
    direction: "SHORT",
    description: "Venta de put. Recibes prima, pero puedes ser asignado si el precio cae.",
    risk: "limitado",
    bias: "bullish",
    premiumLabel: "Prima recibida $",
  },
};

const OPTION_STRATEGY_OPTIONS: Array<{ value: CoreOptionStrategy; label: string }> = [
  { value: "BUY_CALL", label: "Long Call" },
  { value: "BUY_PUT", label: "Long Put" },
  { value: "SELL_CALL", label: "Short Call" },
  { value: "SELL_PUT", label: "Short Put" },
];

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | "Ilimitado"): string {
  return value === "Ilimitado" ? value : `$${value.toFixed(2)}`;
}

function payoff(
  strategy: CoreOptionStrategy,
  priceAtExpiration: number,
  strike: number,
  premium: number,
  contracts: number
): number {
  const multiplier = contracts * 100;
  const callIntrinsic = Math.max(priceAtExpiration - strike, 0) * multiplier;
  const putIntrinsic = Math.max(strike - priceAtExpiration, 0) * multiplier;
  const totalPremium = premium * multiplier;

  if (strategy === "BUY_CALL") return callIntrinsic - totalPremium;
  if (strategy === "BUY_PUT") return putIntrinsic - totalPremium;
  if (strategy === "SELL_CALL") return totalPremium - callIntrinsic;
  return totalPremium - putIntrinsic;
}

function calculateResult(strategy: CoreOptionStrategy, form: FormState): StrategyResult {
  const current = toNumber(form.currentPrice);
  const strike = toNumber(form.strikePrice);
  const premium = toNumber(form.premium);
  const contracts = Math.max(1, toNumber(form.contracts));
  const multiplier = contracts * 100;
  const totalPremium = premium * multiplier;

  const breakeven =
    strategy === "BUY_CALL" || strategy === "SELL_CALL"
      ? strike + premium
      : strike - premium;

  let maxProfit: StrategyResult["maxProfit"];
  let maxLoss: StrategyResult["maxLoss"];

  if (strategy === "BUY_CALL") {
    maxProfit = "Ilimitado";
    maxLoss = totalPremium;
  } else if (strategy === "BUY_PUT") {
    maxProfit = Math.max(strike * multiplier - totalPremium, 0);
    maxLoss = totalPremium;
  } else if (strategy === "SELL_CALL") {
    maxProfit = totalPremium;
    maxLoss = "Ilimitado";
  } else {
    maxProfit = totalPremium;
    maxLoss = Math.max((strike - premium) * multiplier, 0);
  }

  const outOfTheMoney =
    strategy === "SELL_CALL"
      ? Math.max(strike - current, 0)
      : strategy === "SELL_PUT"
      ? Math.max(current - strike, 0)
      : 0;
  const shortOptionMargin = Math.max(
    totalPremium,
    (premium + Math.max(current * 0.2 - outOfTheMoney, current * 0.1)) * multiplier
  );

  return {
    maxProfit,
    maxLoss,
    breakeven,
    netPremium: totalPremium,
    requiredMargin:
      strategy === "BUY_CALL" || strategy === "BUY_PUT" ? totalPremium : shortOptionMargin,
    scenarioAtm: payoff(strategy, current, strike, premium, contracts),
    scenarioPlus5: payoff(strategy, current * 1.05, strike, premium, contracts),
    scenarioMinus5: payoff(strategy, current * 0.95, strike, premium, contracts),
  };
}

export function OptionStrategyParamsModal({ open, strategy, ticker, onClose }: Props) {
  const { selectedStrike } = useSignalStore();
  const meta = STRATEGY_COPY[strategy];
  const [form, setForm] = useState<FormState>({
    ticker,
    currentPrice: "",
    strikePrice: "100",
    premium: "2.50",
    contracts: "1",
    expiration: isoPlusDays(30),
    capital: "10000",
    impliedVolatility: "25",
    thetaDecay: "LINEAR",
    riskFreeRate: "4",
  });
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm((prev) => {
      const nextTicker = ticker.toUpperCase();
      const shouldUseSelectedStrike =
        selectedStrike &&
        ((meta.optionType === "CALL" && selectedStrike.type === "call") ||
          (meta.optionType === "PUT" && selectedStrike.type === "put"));

      return {
        ...prev,
        ticker: nextTicker,
        strikePrice: shouldUseSelectedStrike ? String(selectedStrike.strike) : prev.strikePrice,
        premium: shouldUseSelectedStrike && selectedStrike.premium > 0 ? String(selectedStrike.premium) : prev.premium,
        impliedVolatility: shouldUseSelectedStrike && selectedStrike.iv > 0
          ? String(Number((selectedStrike.iv * 100).toFixed(2)))
          : prev.impliedVolatility,
      };
    });
    setResult(null);
  }, [open, ticker, selectedStrike, meta.optionType]);

  useEffect(() => {
    if (!open || !form.ticker) return;

    let cancelled = false;
    setPriceLoading(true);
    setPriceError(null);

    getMarketQuotes([form.ticker])
      .then((data) => {
        if (cancelled) return;
        const quote = data.quotes.find((q) => q.symbol === form.ticker.toUpperCase());
        if (!quote || quote.price <= 0) {
          setPriceError("Precio no disponible");
          return;
        }
        setForm((prev) => ({
          ...prev,
          currentPrice: quote.price.toFixed(2),
          strikePrice: selectedStrike ? prev.strikePrice : quote.price.toFixed(0),
        }));
      })
      .catch(() => {
        if (!cancelled) setPriceError("No se pudo cargar precio");
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, form.ticker, selectedStrike]);

  const canCalculate = useMemo(() => {
    return toNumber(form.strikePrice) > 0 && toNumber(form.premium) >= 0 && toNumber(form.contracts) > 0;
  }, [form.strikePrice, form.premium, form.contracts]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "7px 10px",
    fontSize: "var(--font-size-sm)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: 0,
  };

  const labelTextStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    fontWeight: 700,
    textTransform: "uppercase",
  };

  const metricCard = (label: string, value: string) => (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-surface-raised)",
        padding: "var(--space-sm)",
        minHeight: 58,
      }}
    >
      <div style={{ ...labelTextStyle, fontSize: "10px", marginBottom: 4 }}>{label}</div>
      <strong style={{ fontSize: "var(--font-size-sm)" }}>{value}</strong>
    </div>
  );

  return (
    <ContentModal
      isOpen={open}
      onClose={onClose}
      title={meta.title}
      subtitle={meta.description}
      width="520px"
      data-testid="option-strategy-params-modal"
    >
      <div style={{ display: "grid", gap: "var(--space-md)" }}>
        <div style={{ display: "flex", gap: "var(--space-xs)", alignItems: "center", flexWrap: "wrap" }}>
          <Shield size={16} color="var(--color-buy)" />
          <span style={{ color: "var(--color-accent)", background: "var(--color-accent-subtle)", borderRadius: "var(--radius-pill)", padding: "2px 10px", fontSize: "var(--font-size-xs)", fontWeight: 700 }}>
            Riesgo {meta.risk}
          </span>
          <span style={{ color: meta.bias === "bullish" ? "var(--color-buy)" : "var(--color-sell)", fontSize: "var(--font-size-xs)", fontWeight: 700 }}>
            {meta.bias}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-sm)" }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Ticker</span>
            <input style={inputStyle} value={form.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Precio actual {priceLoading ? "(cargando)" : priceError ? `(${priceError})` : ""}</span>
            <input style={inputStyle} type="number" step="0.01" value={form.currentPrice} onChange={(e) => update("currentPrice", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Strike $</span>
            <input style={inputStyle} type="number" step="0.01" value={form.strikePrice} onChange={(e) => update("strikePrice", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>{meta.premiumLabel}</span>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.premium} onChange={(e) => update("premium", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Cantidad</span>
            <input style={inputStyle} type="number" min="1" step="1" value={form.contracts} onChange={(e) => update("contracts", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Expiracion</span>
            <input style={inputStyle} type="date" value={form.expiration} onChange={(e) => update("expiration", e.target.value)} />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Capital $</span>
            <input style={inputStyle} type="number" min="0" step="100" value={form.capital} onChange={(e) => update("capital", e.target.value)} />
          </label>
        </div>

        <fieldset style={{ border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-sm)", padding: "var(--space-sm)", margin: 0 }}>
          <legend style={{ ...labelTextStyle, padding: "0 var(--space-xs)" }}>Supuestos avanzados</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-sm)" }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Vol. implicita %</span>
              <input style={inputStyle} type="number" min="0" step="0.1" value={form.impliedVolatility} onChange={(e) => update("impliedVolatility", e.target.value)} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Theta decay</span>
              <select style={inputStyle} value={form.thetaDecay} onChange={(e) => update("thetaDecay", e.target.value)}>
                <option value="LINEAR">LINEAR</option>
                <option value="EXPONENTIAL">EXPONENTIAL</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Tasa interes %</span>
              <input style={inputStyle} type="number" min="0" step="0.1" value={form.riskFreeRate} onChange={(e) => update("riskFreeRate", e.target.value)} />
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          disabled={!canCalculate}
          onClick={() => setResult(calculateResult(strategy, form))}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            background: canCalculate ? "var(--color-accent)" : "var(--color-surface-raised)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "0.65rem 1rem",
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            cursor: canCalculate ? "pointer" : "not-allowed",
          }}
        >
          <Play size={13} fill="currentColor" strokeWidth={0} />
          Calcular
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-xs)" }}>
          {metricCard("Max. profit", result ? formatMoney(result.maxProfit) : "-")}
          {metricCard("Max. loss", result ? formatMoney(result.maxLoss) : "-")}
          {metricCard("Breakeven", result ? `$${result.breakeven.toFixed(2)}` : "-")}
          {metricCard(meta.direction === "LONG" ? "Prima neta" : "Credito neto", result ? `$${result.netPremium.toFixed(2)}` : "-")}
          {metricCard("Margen req.", result ? `$${result.requiredMargin.toFixed(2)}` : "-")}
          {metricCard("Escenario +5%", result ? `$${result.scenarioPlus5.toFixed(2)}` : "-")}
          {metricCard("Escenario ATM", result ? `$${result.scenarioAtm.toFixed(2)}` : "-")}
          {metricCard("Escenario -5%", result ? `$${result.scenarioMinus5.toFixed(2)}` : "-")}
        </div>
      </div>
    </ContentModal>
  );
}

export { OPTION_STRATEGY_OPTIONS };
