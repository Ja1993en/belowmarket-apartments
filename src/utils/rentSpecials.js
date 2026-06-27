const RENT_CONCESSION_PATTERN =
  /(\b\d+(?:\.\d+)?\s*(?:week|weeks|wk|wks|month|months|mo|mos)\s+free\b|\b(?:week|weeks|month|months)\s+free\b|\bfree\s+(?:rent|month|months|week|weeks)\b|\b\d+\s*%\s*off\s+(?:base\s+)?rent\b|\b(?:half|50%)\s+off\s+rent\b|\boff\s+(?:base\s+)?rent\b|\brent\s+credit\b|\bbase\s+rent\b|\bconcession\b)/i;

const NON_RENT_ONLY_PATTERN =
  /(\$0\s*deposit|zero\s+deposit|no\s+deposit|deposit|admin|application|app\s*fee|fee|fees|waiv|waived|waive)/i;

function getSpecialText(value) {
  return String(value || "").trim();
}

function parseFirstMoneyValue(value) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  const parsedValue = Number(match?.[0] || 0);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function isRentConcessionSpecialText(value) {
  return RENT_CONCESSION_PATTERN.test(getSpecialText(value));
}

export function isNonRentOnlySpecialText(value) {
  const specialText = getSpecialText(value);

  return NON_RENT_ONLY_PATTERN.test(specialText) && !isRentConcessionSpecialText(specialText);
}

export function shouldShowRentConcessionMetrics({
  specialLabel,
  rent,
  effectiveRent,
  savings,
}) {
  if (isNonRentOnlySpecialText(specialLabel)) {
    return false;
  }

  if (isRentConcessionSpecialText(specialLabel)) {
    return true;
  }

  const rentNumber = parseFirstMoneyValue(rent);
  const effectiveRentNumber = parseFirstMoneyValue(effectiveRent);
  const savingsNumber = parseFirstMoneyValue(savings);

  return (
    (rentNumber > 0 && effectiveRentNumber > 0 && effectiveRentNumber < rentNumber) ||
    savingsNumber > 0
  );
}
