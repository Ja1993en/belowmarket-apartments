export function parseCurrency(value) {
  const parsedValue = Number(String(value || "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function formatCurrency(value) {
  const numberValue =
    typeof value === "number" ? value : parseCurrency(value);

  if (!numberValue) return "";

  return `$${Math.round(numberValue).toLocaleString()}`;
}

export function formatRent(value, fallback = "Contact") {
  if (value === null || value === undefined || value === "") return fallback;

  const textValue = String(value).trim();
  if (!textValue) return fallback;

  if (/[$%]|contact|verify|call|ask/i.test(textValue)) {
    return textValue;
  }

  const currencyValue = parseCurrency(textValue);
  if (!currencyValue) return textValue;

  const suffix = /\/\s*mo|monthly/i.test(textValue) ? "/mo" : "";
  return `${formatCurrency(currencyValue)}${suffix}`;
}

export function formatSavings(value, fallback = "Verify") {
  if (value === null || value === undefined || value === "") return fallback;

  const textValue = String(value).trim();
  if (!textValue) return fallback;

  if (/[$%]|\/\s*mo|monthly|verify|none/i.test(textValue)) {
    return textValue;
  }

  const currencyValue = parseCurrency(textValue);
  if (!currencyValue) return textValue;

  return `${formatCurrency(currencyValue)}/mo`;
}

export function formatPercent(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;

  const textValue = String(value).trim();
  if (!textValue) return fallback;
  if (textValue.includes("%")) return textValue;

  const numberValue = Number(textValue.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numberValue)) return fallback;

  return `${Math.round(numberValue)}%`;
}

export function formatAvailability(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const textValue = String(value).trim();
  if (!textValue) return fallback;

  const availableCountMatch = textValue.match(
    /^(\d+)(?:\s+available(?:\s+units?)?)?$/i
  );

  if (availableCountMatch) {
    return `${Number(availableCountMatch[1])} available`;
  }

  return textValue.replace(/\s+available\s+units?$/i, " available");
}
