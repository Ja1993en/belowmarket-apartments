export const DALLAS_MODERN_RENT_MINIMUMS = {
  studio: 1200,
  "1": 1400,
  "2": 1900,
  "3": 2400,
};

const BEDROOM_LABELS = {
  studio: "studio",
  "1": "1-bedroom",
  "2": "2-bedroom",
  "3": "3-bedroom",
};

const LOWER_BEDROOM_SUGGESTIONS = {
  "1": "a studio",
  "2": "a 1-bedroom",
  "3": "a 2-bedroom",
};

export const DALLAS_BUDGET_GUIDE =
  "Modern Dallas guide: Studio $1,200+, 1 Bed $1,400+, 2 Bed $1,900+, 3 Bed $2,400+.";

export function getBudgetQualificationMessage(bedrooms, budget) {
  const bedroomKey = getBedroomQualificationKey(bedrooms);
  const budgetAmount = parseBudgetAmount(budget);

  if (!bedroomKey || !budgetAmount) return "";

  const minimumBudget = DALLAS_MODERN_RENT_MINIMUMS[bedroomKey];
  if (!minimumBudget || budgetAmount >= minimumBudget) return "";

  const bedroomLabel = BEDROOM_LABELS[bedroomKey];
  const lowerBedroomSuggestion = LOWER_BEDROOM_SUGGESTIONS[bedroomKey];
  const changeOption = lowerBedroomSuggestion
    ? `Increase your budget or choose ${lowerBedroomSuggestion} to see better matches.`
    : "Increase your budget to see better matches.";

  return `Most modern ${bedroomLabel} Downtown Dallas apartments start closer to ${formatCurrency(
    minimumBudget
  )}+. ${changeOption}`;
}

export function parseBudgetAmount(value) {
  const budgetText = String(value || "").trim();
  if (!budgetText) return null;

  const matches = budgetText.match(/\d[\d,.]*(?:\s*k)?/gi) || [];
  const amounts = matches
    .map((match) => {
      const normalizedMatch = match.trim();
      const hasThousandsSuffix = /k$/i.test(normalizedMatch);
      const amount = Number(normalizedMatch.replace(/[^0-9.]/g, ""));

      if (!Number.isFinite(amount)) return null;
      return hasThousandsSuffix ? amount * 1000 : amount;
    })
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (amounts.length === 0) return null;

  return Math.max(...amounts);
}

function getBedroomQualificationKey(value) {
  const bedroomText = String(value || "").toLowerCase();

  if (!bedroomText) return "";
  if (bedroomText.includes("studio") || bedroomText.includes("eff")) return "studio";
  if (bedroomText.includes("3") || bedroomText.includes("three")) return "3";
  if (bedroomText.includes("2") || bedroomText.includes("two")) return "2";
  if (bedroomText.includes("1") || bedroomText.includes("one")) return "1";

  return "";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
