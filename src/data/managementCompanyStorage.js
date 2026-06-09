const MANAGEMENT_COMPANIES_KEY = "belowMarketManagementCompanies";

const defaultManagementCompanies = [
  {
    id: "greystar",
    name: "Greystar",
    contactName: "",
    phone: "",
    email: "",
  },
  {
    id: "rpm-living",
    name: "RPM Living",
    contactName: "",
    phone: "",
    email: "",
  },
  {
    id: "willow-bridge",
    name: "Willow Bridge",
    contactName: "",
    phone: "",
    email: "",
  },
];

export function getStoredManagementCompanies() {
  return JSON.parse(localStorage.getItem(MANAGEMENT_COMPANIES_KEY) || "[]");
}

export function getAllManagementCompanies() {
  const storedCompanies = getStoredManagementCompanies();
  const companyMap = new Map();

  [...defaultManagementCompanies, ...storedCompanies].forEach((company) => {
    companyMap.set(company.id, company);
  });

  return [...companyMap.values()].sort((firstCompany, secondCompany) =>
    firstCompany.name.localeCompare(secondCompany.name)
  );
}

export function getManagementCompanyById(companyId) {
  return getAllManagementCompanies().find(
    (company) => company.id === String(companyId)
  );
}

export function getManagementCompanyIdByName(companyName) {
  const normalizedCompanyName = normalizeCompanyName(companyName);

  return getAllManagementCompanies().find(
    (company) => normalizeCompanyName(company.name) === normalizedCompanyName
  )?.id || "";
}

export function createStoredManagementCompany(companyDraft) {
  const name = String(companyDraft.name || "").trim();

  if (!name) {
    throw new Error("Management company name is required.");
  }

  const storedCompanies = getStoredManagementCompanies();
  const companyId = createUniqueManagementCompanyId(name);
  const company = {
    id: companyId,
    name,
    contactName: String(companyDraft.contactName || "").trim(),
    phone: String(companyDraft.phone || "").trim(),
    email: String(companyDraft.email || "").trim(),
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(
    MANAGEMENT_COMPANIES_KEY,
    JSON.stringify([...storedCompanies, company])
  );

  return company;
}

function createUniqueManagementCompanyId(name) {
  const existingIds = new Set(getAllManagementCompanies().map((company) => company.id));
  const fallbackId = `management-company-${Date.now()}`;
  const baseId = slugify(name) || fallbackId;
  let companyId = baseId;
  let suffix = 2;

  while (existingIds.has(companyId)) {
    companyId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return companyId;
}

function normalizeCompanyName(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
