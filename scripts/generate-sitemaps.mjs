import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://belowmarketapartments.com";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const coreRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/properties", priority: "0.9", changefreq: "daily" },
  { path: "/apartments/dallas-tx", priority: "0.9", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/specials", priority: "0.9", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/8-weeks-free", priority: "0.9", changefreq: "weekly" },
  { path: "/dallas-apartments-6-weeks-free", priority: "0.88", changefreq: "weekly" },
  { path: "/dallas-apartments-4-weeks-free", priority: "0.88", changefreq: "weekly" },
  { path: "/dallas-apartments-no-deposit", priority: "0.86", changefreq: "weekly" },
  { path: "/farmers-branch-apartments-specials", priority: "0.86", changefreq: "weekly" },
  { path: "/irving-apartments-specials", priority: "0.86", changefreq: "weekly" },
  { path: "/oak-lawn-apartments-specials", priority: "0.86", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/uptown", priority: "0.85", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/oak-lawn", priority: "0.85", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/bishop-arts", priority: "0.8", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/victory-park", priority: "0.8", changefreq: "weekly" },
  { path: "/apartments/dallas-tx/downtown", priority: "0.8", changefreq: "weekly" },
  { path: "/start", priority: "0.7", changefreq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms-and-conditions", priority: "0.3", changefreq: "yearly" },
];

function loadEnvFile() {
  const envPath = path.join(projectRoot, ".env");

  if (!fs.existsSync(envPath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [
          line.slice(0, separatorIndex),
          line.slice(separatorIndex + 1),
        ];
      })
  );
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function getUrlXml({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    changefreq ? `    <changefreq>${escapeXml(changefreq)}</changefreq>` : "",
    priority ? `    <priority>${escapeXml(priority)}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function getSitemapXml(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(getUrlXml),
    "</urlset>",
    "",
  ].join("\n");
}

async function getLivePropertyEntries() {
  const env = { ...loadEnvFile(), ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Skipping property sitemap: Supabase env variables are missing.");
    return [];
  }

  const data = await fetchSupabaseRows({
    key: supabaseKey,
    path: "/rest/v1/properties?select=id,status,updated_at,data&order=updated_at.desc",
    url: supabaseUrl,
  }).catch((error) => {
    console.warn(`Skipping property sitemap: ${error.message}`);
    return [];
  });

  return (data || [])
    .filter((row) => (row.data?.status || row.status) === "Live")
    .map((row) => ({
      loc: `${SITE_URL}/properties/${encodeURIComponent(row.id)}`,
      lastmod: formatDate(row.updated_at || row.data?.updatedAt || row.data?.updated_at),
      changefreq: "weekly",
      priority: "0.8",
    }));
}

function fetchSupabaseRows({ key, path: requestPath, url }) {
  return new Promise((resolve, reject) => {
    const supabaseUrl = new URL(url);
    const request = https.request(
      {
        hostname: supabaseUrl.hostname,
        method: "GET",
        path: requestPath,
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          accept: "application/json",
        },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Supabase returned ${response.statusCode}: ${body}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

const today = formatDate();
const coreEntries = coreRoutes.map((route) => ({
  loc: `${SITE_URL}${route.path}`,
  lastmod: today,
  changefreq: route.changefreq,
  priority: route.priority,
}));
const propertyEntries = await getLivePropertyEntries();

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), getSitemapXml(coreEntries));
fs.writeFileSync(
  path.join(publicDir, "property-sitemap.xml"),
  getSitemapXml(propertyEntries)
);

console.log(`Generated sitemap.xml with ${coreEntries.length} URLs.`);
console.log(`Generated property-sitemap.xml with ${propertyEntries.length} URLs.`);
