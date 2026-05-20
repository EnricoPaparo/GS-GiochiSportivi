export function normalizePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatMeasure(value, kind) {
  if (value === null || value === undefined || value === "") return "-";
  const suffix = kind === "time" ? " s" : " m";
  return `${Number(value).toLocaleString("it-IT", { maximumFractionDigits: 2 })}${suffix}`;
}
