import { supabase } from "./supabaseClient";

const defaultManagementCompanies = [
  { id: "greystar", name: "Greystar", contactName: "", phone: "", email: "" },
  { id: "rpm-living", name: "RPM Living", contactName: "", phone: "", email: "" },
  { id: "willow-bridge", name: "Willow Bridge", contactName: "", phone: "", email: "" },
];

export async function getAllManagementCompanies() {
  const { data, error } = await supabase
    .from("management_companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  const companyMap = new Map();
  defaultManagementCompanies.forEach((company) => companyMap.set(company.id, company));
  (data || []).map(mapSupabaseManagementCompany).forEach((company) => companyMap.set(company.id, company));

  return [...companyMap.values()].sort((firstCompany, secondCompany) =>
    firstCompany.name.localeCompare(secondCompany.name)
  );
}

export async function getManagementCompanyById(companyId) {
  if (!companyId) return null;

  const defaultCompany = defaultManagementCompanies.find(
    (company) => company.id === String(companyId)
  );

  if (defaultCompany) return defaultCompany;

  const { data, error } = await supabase
    .from("management_companies")
    .select("*")
    .eq("id", String(companyId))
    .maybeSingle();

  if (error) throw error;

  return data ? mapSupabaseManagementCompany(data) : null;
}

export async function getManagementCompanyIdByName(companyName) {
  const normalizedCompanyName = normalizeCompanyName(companyName);
  const companies = await getAllManagementCompanies();

  return companies.find(
    (company) => normalizeCompanyName(company.name) === normalizedCompanyName
  )?.id || "";
}

export async function createStoredManagementCompany(companyDraft) {
  const name = String(companyDraft.name || "").trim();

  if (!name) {
    throw new Error("Management company name is required.");
  }

  const companyId = await createUniqueManagementCompanyId(name);
  const company = {
    id: companyId,
    name,
    contactName: String(companyDraft.contactName || "").trim(),
    phone: String(companyDraft.phone || "").trim(),
    email: String(companyDraft.email || "").trim(),
    createdAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("management_companies").insert({
    id: company.id,
    name: company.name,
    contact_name: company.contactName,
    phone: company.phone,
    email: company.email,
    data: company,
  });

  if (error) throw error;

  return company;
}

async function createUniqueManagementCompanyId(name) {
  const existingCompanies = await getAllManagementCompanies();
  const existingIds = new Set(existingCompanies.map((company) => company.id));
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

function mapSupabaseManagementCompany(row) {
  const data = row.data || {};

  return {
    ...data,
    id: row.id,
    name: data.name || row.name || "",
    contactName: data.contactName || row.contact_name || "",
    phone: data.phone || row.phone || "",
    email: data.email || row.email || "",
    createdAt: data.createdAt || row.created_at || "",
  };
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
