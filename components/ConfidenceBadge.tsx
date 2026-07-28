// Small pill surfacing the predictive engine's confidence + method — kept
// deliberately explainable (see lib/predictionEngine.ts's computeConfidence)
// rather than a bare, falsely-precise-looking number: the tooltip always
// spells out exactly what backed the prediction.
export function ConfidenceBadge({
  confidence,
  basis,
  method,
}: {
  confidence: number;
  basis: string;
  method: string;
}) {
  const label = basis === "FORECAST_ENSEMBLE" ? "forecast blend" : "trend only";
  return (
    <span
      title={method}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium surface-card"
    >
      {confidence}% confidence · {label}
    </span>
  );
}
