const GOOGLE_ADS_ID = "AW-18240067010";
const GOOGLE_ADS_LEAD_CONVERSION_ID =
  "AW-18240067010/ZJoaCLTRpsYcEMKrxflD";
const GOOGLE_ADS_SCRIPT_SELECTOR = "script[data-bma-google-ads='true']";

let isGoogleAdsConfigured = false;

function ensureGoogleTagQueue() {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  return window.gtag;
}

export function initializeGoogleAdsTracking() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const gtag = ensureGoogleTagQueue();

  if (!isGoogleAdsConfigured) {
    gtag("js", new Date());
    gtag("config", GOOGLE_ADS_ID);
    isGoogleAdsConfigured = true;
  }

  if (!document.querySelector(GOOGLE_ADS_SCRIPT_SELECTOR)) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.bmaGoogleAds = "true";
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_ADS_ID;
    document.head.appendChild(script);
  }

  return gtag;
}

export function trackGoogleAdsLeadConversion(leadId) {
  if (typeof window === "undefined" || !leadId) {
    return false;
  }

  const transactionId = String(leadId);
  const storageKey = "bma-google-ads-lead:" + transactionId;

  try {
    if (window.sessionStorage.getItem(storageKey) === "true") {
      return false;
    }
  } catch {
    // Google also deduplicates conversion events using transaction_id.
  }

  const gtag = initializeGoogleAdsTracking();
  if (typeof gtag !== "function") {
    return false;
  }

  gtag("event", "conversion", {
    send_to: GOOGLE_ADS_LEAD_CONVERSION_ID,
    value: 1.0,
    currency: "USD",
    transaction_id: transactionId,
  });

  try {
    window.sessionStorage.setItem(storageKey, "true");
  } catch {
    // The conversion is still queued when browser storage is unavailable.
  }

  return true;
}
